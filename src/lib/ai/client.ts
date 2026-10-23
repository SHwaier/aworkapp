import { ApiError, GoogleGenAI, type ThinkingConfig, type ThinkingLevel } from "@google/genai";
import { z } from "zod";

/** Model used for all AI features; override with GEMINI_MODEL. */
export const AI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

/**
 * Model to switch to when the main one is overloaded, out of quota, or returns
 * bad output. GEMINI_FALLBACK_MODEL, or the older GEMINI_INSIGHTS_MODEL setting.
 * Free-tier quotas are per model, so the fallback has its own headroom.
 */
export const FALLBACK_MODEL: string | null = (() => {
  const m = (process.env.GEMINI_FALLBACK_MODEL || process.env.GEMINI_INSIGHTS_MODEL || "").trim();
  return m && m !== AI_MODEL ? m : null;
})();

const REQUEST_TIMEOUT_MS = 90_000;
const MAX_ATTEMPTS = 3;
/** Wait out a rate limit only if the API asks for at most this long */
const MAX_RATE_LIMIT_WAIT_MS = 20_000;
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

export type AiErrorKind =
  | "unavailable" // overloaded or server error
  | "timeout"
  | "rate_limit" // per-minute limits
  | "quota" // daily or plan quota
  | "bad_output" // empty, malformed, or wrongly shaped response
  | "rejected" // the request itself is invalid
  | "config"
  | "unknown";

/** An AI call failed. `message` is safe to show to users. */
export class AiError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean,
    public readonly cause?: unknown,
    /** How long the API asked us to wait before retrying, if it said */
    public readonly retryAfterMs?: number,
    public readonly kind: AiErrorKind = "unknown"
  ) {
    super(message);
    this.name = "AiError";
  }

  /** Whether another model might succeed where this one failed */
  get canFallback(): boolean {
    return this.kind !== "rejected" && this.kind !== "config";
  }
}

export interface AiUsageStats {
  inputTokens: number;
  /** Includes thinking tokens, which are billed as output */
  outputTokens: number;
  thoughtTokens: number;
}

export const THINKING_EFFORTS = ["minimal", "low", "medium", "high"] as const;
export type ThinkingEffort = (typeof THINKING_EFFORTS)[number];

/** Gemini 2.5 models take a token budget instead of a level. */
const BUDGET_FOR_EFFORT: Record<ThinkingEffort, number> = {
  minimal: 512,
  low: 2048,
  medium: 8192,
  high: 24576,
};

/**
 * Translate an effort setting into the thinking config the model understands:
 * Gemini 3.x accepts thinkingLevel; Gemini 2.5 only accepts thinkingBudget.
 * undefined = the model's default (dynamic) thinking.
 */
export function thinkingConfigFor(
  model: string,
  effort: ThinkingEffort | undefined
): ThinkingConfig | undefined {
  if (!effort) return undefined;
  if (/^gemini-2\./.test(model)) return { thinkingBudget: BUDGET_FOR_EFFORT[effort] };
  return { thinkingLevel: effort.toUpperCase() as ThinkingLevel };
}

/** Read a thinking effort from an env var; unset or invalid = model default. */
export function thinkingEffortFromEnv(name: string): ThinkingEffort | undefined {
  const value = process.env[name]?.trim().toLowerCase();
  return THINKING_EFFORTS.find((e) => e === value);
}

export interface StructuredResult<T> {
  data: T;
  /** The model that produced the result */
  model: string;
  /** True when the main model failed and the fallback answered */
  usedFallback: boolean;
  usage: AiUsageStats;
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new AiError(
      "AI analysis isn't configured on this server.",
      false,
      undefined,
      undefined,
      "config"
    );
  }
  // The SDK sends the key in a header, never in the URL
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

// Bounds make Gemini's constrained decoder reject schemas as having "too many states".
// Enforce limits after parsing instead.
const UNSUPPORTED_SCHEMA_KEYS = new Set([
  "$schema",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "minLength",
  "maxLength",
  "minItems",
  "maxItems",
  "pattern",
  "format",
]);

/** Convert a zod schema to the JSON Schema subset Gemini accepts. */
export function toGeminiSchema(schema: z.ZodType): Record<string, unknown> {
  const strip = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(strip);
    if (node && typeof node === "object") {
      return Object.fromEntries(
        Object.entries(node)
          .filter(([key]) => !UNSUPPORTED_SCHEMA_KEYS.has(key))
          .map(([key, value]) => [key, strip(value)])
      );
    }
    return node;
  };
  return strip(z.toJSONSchema(schema)) as Record<string, unknown>;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generate JSON that matches `schema`. Retries transient failures and validates
 * the response. With a fallback model configured, an overloaded or exhausted main
 * model hands over right away instead of being retried, so users aren't left
 * waiting through long retries.
 */
export async function generateStructured<T>({
  system,
  prompt,
  schema,
  temperature = 0,
  model = AI_MODEL,
  thinking,
  fallbackModel = FALLBACK_MODEL,
  fallbackThinking = thinkingEffortFromEnv("GEMINI_FALLBACK_THINKING") ??
    thinkingEffortFromEnv("GEMINI_INSIGHTS_THINKING") ??
    thinking,
}: {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  temperature?: number;
  /** Defaults to GEMINI_MODEL */
  model?: string;
  /** How much the model thinks before answering; undefined = model default */
  thinking?: ThinkingEffort;
  /** null disables the fallback */
  fallbackModel?: string | null;
  fallbackThinking?: ThinkingEffort;
}): Promise<StructuredResult<T>> {
  const call = { system, prompt, schema, temperature };
  try {
    const result = await callModel(call, model, thinking, fallbackModel ? 2 : MAX_ATTEMPTS, {
      handOff: !!fallbackModel,
    });
    return { ...result, usedFallback: false };
  } catch (err) {
    const aiError = toAiError(err);
    if (!fallbackModel || !aiError.canFallback) throw aiError;
    console.warn(`AI model ${model} failed (${aiError.kind}); using ${fallbackModel}`);
    const result = await callModel(call, fallbackModel, fallbackThinking, 2, { handOff: false });
    return { ...result, usedFallback: true };
  }
}

async function callModel<T>(
  {
    system,
    prompt,
    schema,
    temperature,
  }: {
    system: string;
    prompt: string;
    schema: z.ZodType<T>;
    temperature: number;
  },
  model: string,
  thinking: ThinkingEffort | undefined,
  maxAttempts: number,
  /** handOff: give up on outages and timeouts at once, so the fallback can take over */
  { handOff }: { handOff: boolean }
): Promise<Omit<StructuredResult<T>, "usedFallback">> {
  const thinkingConfig = thinkingConfigFor(model, thinking);
  const ai = getClient();
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: system,
          temperature,
          // Fixed seed: best-effort repeatability for identical inputs
          seed: 7,
          responseMimeType: "application/json",
          responseJsonSchema: toGeminiSchema(schema),
          abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          ...(thinkingConfig ? { thinkingConfig } : {}),
        },
      });

      const raw = response.text;
      if (!raw) {
        throw new AiError(
          "The AI returned an empty response.",
          true,
          undefined,
          undefined,
          "bad_output"
        );
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        throw new AiError("The AI returned malformed output.", true, err, undefined, "bad_output");
      }

      const result = schema.safeParse(parsed);
      if (!result.success) {
        throw new AiError(
          "The AI returned output in an unexpected shape.",
          true,
          result.error,
          undefined,
          "bad_output"
        );
      }

      return {
        data: result.data,
        model,
        usage: {
          inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
          outputTokens:
            (response.usageMetadata?.candidatesTokenCount ?? 0) +
            (response.usageMetadata?.thoughtsTokenCount ?? 0),
          thoughtTokens: response.usageMetadata?.thoughtsTokenCount ?? 0,
        },
      };
    } catch (err) {
      lastError = err;
      const aiError = toAiError(err);
      const outage = aiError.kind === "unavailable" || aiError.kind === "timeout";
      if (!aiError.retryable || attempt === maxAttempts || (handOff && outage)) {
        throw aiError;
      }
      // Honor the API's requested delay; otherwise 1s, 2s (+ jitter)
      await sleep(aiError.retryAfterMs ?? 1000 * 2 ** (attempt - 1) + Math.random() * 500);
    }
  }

  throw toAiError(lastError);
}

function toAiError(err: unknown): AiError {
  if (err instanceof AiError) return err;
  if (err instanceof ApiError) {
    if (err.status === 429) {
      const message = String(err.message);
      // Daily quota (e.g. free tier): retrying won't help until it resets.
      // Per-minute limits use the same "exceeded your current quota" wording but
      // come with a short "retry in Ns" hint, so they're waited out below.
      if (/PerDay|per day/i.test(message)) {
        return new AiError(
          "The AI service has reached its daily usage quota. Please try again tomorrow, or ask an admin to check the Gemini plan.",
          false,
          err,
          undefined,
          "quota"
        );
      }
      const retryAfterMs = parseRetryDelayMs(message);
      if (retryAfterMs !== undefined && retryAfterMs > MAX_RATE_LIMIT_WAIT_MS) {
        return new AiError(
          "The AI service is busy right now. Please try again in a few minutes.",
          false,
          err,
          retryAfterMs,
          "rate_limit"
        );
      }
      return new AiError(
        "The AI service is busy right now. Please try again shortly.",
        true,
        err,
        retryAfterMs,
        "rate_limit"
      );
    }
    if (RETRYABLE_STATUSES.has(err.status)) {
      return new AiError(
        "The AI service is temporarily unavailable. Please try again.",
        true,
        err,
        undefined,
        "unavailable"
      );
    }
    return new AiError("The AI service rejected the request.", false, err, undefined, "rejected");
  }
  if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
    return new AiError(
      "The AI took too long to respond. Please try again.",
      true,
      err,
      undefined,
      "timeout"
    );
  }
  return new AiError("Something went wrong while contacting the AI service.", true, err);
}

/** Parse Gemini's "Please retry in 37.5s" / "retry in 4h19m1s" hint, in ms. */
export function parseRetryDelayMs(message: string): number | undefined {
  const match = /retry in ((?:\d+h)?(?:\d+m)?(?:[\d.]+s)?)/i.exec(message);
  if (!match || !match[1]) return undefined;
  const part = (unit: string) => Number(new RegExp(`([\\d.]+)${unit}`).exec(match[1])?.[1] ?? 0);
  const ms = (part("h") * 3600 + part("m") * 60 + part("s")) * 1000;
  return ms > 0 ? Math.ceil(ms) : undefined;
}
