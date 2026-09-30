import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL } from "./config";

let ai: GoogleGenAI | null = null;

function client() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isRetryable(err: unknown) {
  const msg = String((err as Error)?.message ?? err);
  return /\b(429|500|502|503|504)\b|RESOURCE_EXHAUSTED|UNAVAILABLE|overloaded|timeout|fetch failed|ECONNRESET|terminated|socket|network|EPIPE|ETIMEDOUT/i.test(msg);
}

function retryDelayMs(err: unknown, attempt: number) {
  const m = String((err as Error)?.message ?? "").match(/retry(?:Delay)?["\s:]*"?(\d+(?:\.\d+)?)s/i);
  if (m) return Math.min(Number(m[1]) * 1000 + 500, 45_000);
  return Math.min(2000 * 2 ** attempt, 30_000);
}

/**
 * One structured-output call to Gemini. Callers must only pass redacted CV
 * content - never personal details.
 */
export async function generateJSON<T>(opts: {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  temperature?: number;
}): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await client().models.generateContent({
        model: GEMINI_MODEL,
        contents: opts.prompt,
        config: {
          systemInstruction: opts.system,
          temperature: opts.temperature ?? 0,
          responseMimeType: "application/json",
          responseJsonSchema: opts.schema,
        },
      });
      const text = res.text;
      if (!text) throw new Error("Gemini returned an empty response");
      return JSON.parse(text) as T;
    } catch (err) {
      lastErr = err;
      const parseError = err instanceof SyntaxError;
      if (!parseError && !isRetryable(err)) break;
      await sleep(retryDelayMs(err, attempt));
    }
  }
  throw new Error(`Gemini call failed: ${String((lastErr as Error)?.message ?? lastErr).slice(0, 400)}`);
}
