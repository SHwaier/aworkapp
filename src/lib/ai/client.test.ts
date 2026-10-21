import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const generateContent = vi.fn();

vi.mock("@google/genai", () => {
  class ApiError extends Error {
    status: number;
    constructor({ status, message }: { status: number; message: string }) {
      super(message);
      this.status = status;
    }
  }
  class GoogleGenAI {
    models = { generateContent };
  }
  return { ApiError, GoogleGenAI };
});

const { ApiError } = await import("@google/genai");
const {
  AiError,
  generateStructured,
  parseRetryDelayMs,
  thinkingConfigFor,
  thinkingEffortFromEnv,
  toGeminiSchema,
} = await import("./client");

const schema = z.object({
  answer: z.string().max(10),
  items: z.array(z.number().int().min(0)).max(3),
});
const ok = (data: unknown) => ({
  text: JSON.stringify(data),
  usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, thoughtsTokenCount: 2 },
});

describe("toGeminiSchema", () => {
  it("removes bounds Gemini can't serve but keeps the shape", () => {
    const json = JSON.stringify(toGeminiSchema(schema));
    for (const key of ["maxLength", "maxItems", "minimum", "maximum", "$schema"]) {
      expect(json).not.toContain(`"${key}"`);
    }
    expect(json).toContain('"answer"');
    expect(json).toContain('"integer"');
  });
});

describe("generateStructured", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    generateContent.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  const call = () => generateStructured({ system: "s", prompt: "p", schema });

  it("returns validated data and token usage", async () => {
    generateContent.mockResolvedValueOnce(ok({ answer: "yes", items: [1] }));
    await expect(call()).resolves.toMatchObject({
      data: { answer: "yes", items: [1] },
      usage: { inputTokens: 10, outputTokens: 7, thoughtTokens: 2 },
    });
  });

  it("retries transient errors, then succeeds", async () => {
    generateContent
      .mockRejectedValueOnce(new ApiError({ status: 503, message: "overloaded" }))
      .mockResolvedValueOnce(ok({ answer: "ok", items: [] }));
    const promise = call();
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toMatchObject({ data: { answer: "ok" } });
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("fails fast with a clear message when a daily quota is exhausted", async () => {
    generateContent.mockRejectedValue(
      new ApiError({
        status: 429,
        message:
          "You exceeded your current quota... GenerateRequestsPerDayPerProjectPerModel-FreeTier. Please retry in 4h19m1.18s.",
      })
    );
    await expect(call()).rejects.toMatchObject({
      retryable: false,
      message: expect.stringMatching(/usage quota/),
    });
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("waits the delay the API asks for on a short rate limit, then retries", async () => {
    generateContent
      .mockRejectedValueOnce(
        new ApiError({ status: 429, message: "Rate limited. Please retry in 7.5s." })
      )
      .mockResolvedValueOnce(ok({ answer: "ok", items: [] }));
    const promise = call();
    await vi.advanceTimersByTimeAsync(7000);
    expect(generateContent).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(600);
    await expect(promise).resolves.toMatchObject({ data: { answer: "ok" } });
  });

  it("gives up immediately when asked to wait too long", async () => {
    generateContent.mockRejectedValue(
      new ApiError({ status: 429, message: "Please retry in 3m10s." })
    );
    await expect(call()).rejects.toMatchObject({ retryable: false });
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("does not retry a rejected request", async () => {
    generateContent.mockRejectedValue(new ApiError({ status: 400, message: "bad schema" }));
    await expect(call()).rejects.toMatchObject({ name: "AiError", retryable: false });
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("retries malformed or wrongly-shaped output, then gives up", async () => {
    generateContent
      .mockResolvedValueOnce({ text: "not json" })
      .mockResolvedValueOnce(ok({ answer: 42 }))
      .mockResolvedValueOnce(ok({ wrong: true }));
    const promise = call();
    const assertion = expect(promise).rejects.toBeInstanceOf(AiError);
    await vi.runAllTimersAsync();
    await assertion;
    expect(generateContent).toHaveBeenCalledTimes(3);
  });

  it("fails clearly when no API key is configured", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.resetModules();
    const fresh = await import("./client");
    await expect(fresh.generateStructured({ system: "s", prompt: "p", schema })).rejects.toThrow(
      /isn't configured/
    );
  });

  it("sends the key via the SDK, never in a URL", async () => {
    generateContent.mockResolvedValueOnce(ok({ answer: "a", items: [] }));
    await call();
    expect(JSON.stringify(generateContent.mock.calls[0])).not.toContain("test-key");
  });
});

describe("parseRetryDelayMs", () => {
  it.each([
    ["Please retry in 37.5s.", 37_500],
    ["Please retry in 3m10s.", 190_000],
    ["Please retry in 4h19m1.5s.", 15_541_500],
    ["no hint here", undefined],
  ])("%s", (msg, expected) => {
    expect(parseRetryDelayMs(msg)).toBe(expected);
  });
});

describe("thinking effort", () => {
  it("uses a token budget on Gemini 2.5 and a level on newer models", () => {
    expect(thinkingConfigFor("gemini-2.5-flash", "medium")).toEqual({ thinkingBudget: 8192 });
    expect(thinkingConfigFor("gemini-2.5-flash", "high")).toEqual({ thinkingBudget: 24576 });
    expect(thinkingConfigFor("gemini-3.5-flash-lite", "medium")).toEqual({
      thinkingLevel: "MEDIUM",
    });
    expect(thinkingConfigFor("gemini-3.5-flash-lite", "high")).toEqual({ thinkingLevel: "HIGH" });
  });

  it("leaves the model default when unset", () => {
    expect(thinkingConfigFor("gemini-2.5-flash", undefined)).toBeUndefined();
  });

  it("reads valid values from env and ignores anything else", () => {
    vi.stubEnv("TEST_THINKING", " High ");
    expect(thinkingEffortFromEnv("TEST_THINKING")).toBe("high");
    vi.stubEnv("TEST_THINKING", "max");
    expect(thinkingEffortFromEnv("TEST_THINKING")).toBeUndefined();
    vi.unstubAllEnvs();
  });

  it("sends the thinking config to the API", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    generateContent.mockReset();
    generateContent.mockResolvedValueOnce(ok({ answer: "a", items: [] }));
    await generateStructured({
      system: "s",
      prompt: "p",
      schema,
      model: "gemini-3.5-flash-lite",
      thinking: "high",
    });
    expect(generateContent.mock.calls[0][0].config.thinkingConfig).toEqual({
      thinkingLevel: "HIGH",
    });
    vi.unstubAllEnvs();
  });
});
