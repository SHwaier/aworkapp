import { ApiError, GoogleGenAI } from "@google/genai";
import { z } from "zod";

/** Model used for all AI features; override with GEMINI_MODEL. */
export const AI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const REQUEST_TIMEOUT_MS = 90_000;
const MAX_ATTEMPTS = 3;
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

/** An AI call failed. `message` is safe to show to users. */
export class AiError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "AiError";
  }
}

export interface AiUsageStats {
  inputTokens: number;
  outputTokens: number;
}

export interface StructuredResult<T> {
  data: T;
  model: string;
  usage: AiUsageStats;
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new AiError("AI analysis isn't configured on this server.", false);
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
 * Generate JSON that matches `schema`. Retries transient failures with
 * exponential backoff and validates the response before returning it.
 */
export async function generateStructured<T>({
  system,
  prompt,
  schema,
  temperature = 0,
}: {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  temperature?: number;
}): Promise<StructuredResult<T>> {
  const ai = getClient();
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: AI_MODEL,
        contents: prompt,
        config: {
          systemInstruction: system,
          temperature,
          // Fixed seed: best-effort repeatability for identical inputs
          seed: 7,
          responseMimeType: "application/json",
          responseJsonSchema: toGeminiSchema(schema),
          abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      });

      const raw = response.text;
      if (!raw) {
        throw new AiError("The AI returned an empty response.", true);
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        throw new AiError("The AI returned malformed output.", true, err);
      }

      const result = schema.safeParse(parsed);
      if (!result.success) {
        throw new AiError("The AI returned output in an unexpected shape.", true, result.error);
      }

      return {
        data: result.data,
        model: AI_MODEL,
        usage: {
          inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
          outputTokens:
            (response.usageMetadata?.candidatesTokenCount ?? 0) +
            (response.usageMetadata?.thoughtsTokenCount ?? 0),
        },
      };
    } catch (err) {
      lastError = err;
      const aiError = toAiError(err);
      if (!aiError.retryable || attempt === MAX_ATTEMPTS) {
        throw aiError;
      }
      // 1s, 2s (+ jitter) between attempts
      await sleep(1000 * 2 ** (attempt - 1) + Math.random() * 500);
    }
  }

  throw toAiError(lastError);
}

function toAiError(err: unknown): AiError {
  if (err instanceof AiError) return err;
  if (err instanceof ApiError) {
    if (err.status === 429) {
      return new AiError("The AI service is busy right now. Please try again shortly.", true, err);
    }
    if (RETRYABLE_STATUSES.has(err.status)) {
      return new AiError("The AI service is temporarily unavailable. Please try again.", true, err);
    }
    return new AiError("The AI service rejected the request.", false, err);
  }
  if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
    return new AiError("The AI took too long to respond. Please try again.", true, err);
  }
  return new AiError("Something went wrong while contacting the AI service.", true, err);
}
