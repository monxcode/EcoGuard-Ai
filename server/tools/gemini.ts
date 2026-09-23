import { GoogleGenAI } from "@google/genai";
import type { ZodType } from "zod";
import { config, geminiConfigured } from "../config/env";

export interface AiTextResult {
  text: string;
  usedGemini: boolean;
  /** User-friendly reason output is unavailable. Never contains secrets. */
  error?: string;
}

export interface AiJsonResult<T> {
  data: T | null;
  usedGemini: boolean;
  error?: string;
}

/** Per-request HTTP timeout for every Gemini call (milliseconds). */
const GEMINI_TIMEOUT_MS = 20_000;

/**
 * Ground rules appended to every prompt — Gemini interprets provided data only
 * and must never invent measurements. Kept here so every feature inherits them.
 */
export const AI_GROUND_RULES = [
  "Ground rules (non-negotiable):",
  "- Use ONLY the measurements and facts provided in the prompt. Never invent AQI, temperature,",
  "  humidity, wind, rainfall, pollution readings, or any other measurement.",
  "- Clearly distinguish measured data, forecast data, estimated analysis, and your AI interpretation.",
  "- If a required input is unavailable, state that it is unavailable.",
  "- Be concise and useful; avoid long explanations; never reveal chain-of-thought.",
].join("\n");

const NOT_CONFIGURED =
  "AI is not configured (GEMINI_API_KEY missing) — using the rules-based fallback.";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  // Tests must stay offline and deterministic — fallbacks are exercised instead.
  if (process.env.VITEST) return null;
  if (!geminiConfigured || !config.geminiApiKey) return null;
  if (!client) {
    client = new GoogleGenAI({
      apiKey: config.geminiApiKey,
      httpOptions: { timeout: GEMINI_TIMEOUT_MS },
    });
  }
  return client;
}

export function aiAvailable(): boolean {
  return getClient() !== null;
}

/** Remove the API key from any string before it is logged or surfaced. */
function sanitize(message: string): string {
  const key = config.geminiApiKey;
  if (key && message.includes(key)) return message.split(key).join("[redacted]");
  return message;
}

/** Map provider failures to short, user-friendly, secret-free messages. */
export function describeAiError(err: unknown): string {
  const raw = sanitize(err instanceof Error ? err.message : String(err));
  if (/rate|429|quota|RESOURCE_EXHAUSTED/i.test(raw)) {
    return "AI service is rate-limited — try again in a minute.";
  }
  if (/api.?key|401|403|UNAUTHENTICATED|PERMISSION_DENIED/i.test(raw)) {
    return "AI service rejected the API key — check GEMINI_API_KEY on the server.";
  }
  if (/timeout|timed out|deadline|DEADLINE_EXCEEDED|abort/i.test(raw)) {
    return "AI service timed out — try again.";
  }
  return "AI service is temporarily unavailable — try again.";
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON object in model output");
  return JSON.parse(candidate.slice(start, end + 1));
}

/**
 * Generate structured JSON from Gemini and validate it with a Zod schema.
 * Malformed output is retried once with corrective feedback; a final failure
 * returns `data: null` so callers can use their deterministic fallback.
 */
export async function generateValidatedJson<T>(
  prompt: string,
  schema: ZodType<T>,
): Promise<AiJsonResult<T>> {
  const ai = getClient();
  if (!ai) return { data: null, usedGemini: false, error: NOT_CONFIGURED };

  const base = `${prompt}\n\n${AI_GROUND_RULES}`;
  let lastError = "unknown error";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const attemptPrompt =
      attempt === 0
        ? `${base}\n\nRespond with a single JSON object only. No prose, no markdown fences.`
        : `${base}\n\nYour previous response was invalid JSON or failed validation (${lastError}). ` +
          `Respond with a single valid JSON object only that matches the requested fields exactly.`;
    try {
      const response = await ai.models.generateContent({
        model: config.geminiModel,
        contents: attemptPrompt,
        config: { responseMimeType: "application/json", temperature: 0.2 },
      });
      const text = response.text ?? "";
      const parsed = extractJson(text);
      const result = schema.safeParse(parsed);
      if (result.success) return { data: result.data, usedGemini: true };
      lastError = sanitize(
        result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      );
    } catch (err) {
      lastError = describeAiError(err);
      console.warn("[ecoguard] Gemini JSON generation failed:", lastError);
    }
  }
  return { data: null, usedGemini: true, error: lastError };
}

/** Free-form text generation; empty text + friendly error when unavailable. */
export async function generateText(prompt: string): Promise<AiTextResult> {
  const ai = getClient();
  if (!ai) return { text: "", usedGemini: false, error: NOT_CONFIGURED };
  try {
    const response = await ai.models.generateContent({
      model: config.geminiModel,
      contents: `${prompt}\n\n${AI_GROUND_RULES}`,
      config: { temperature: 0.3 },
    });
    const text = (response.text ?? "").trim();
    if (!text) {
      return { text: "", usedGemini: true, error: "AI returned an empty response — try again." };
    }
    return { text, usedGemini: true };
  } catch (err) {
    const friendly = describeAiError(err);
    console.warn("[ecoguard] Gemini text generation failed:", friendly);
    return { text: "", usedGemini: false, error: friendly };
  }
}

/** Validated JSON generation with an inline image part (vision). */
export async function generateValidatedJsonWithImage<T>(
  prompt: string,
  schema: ZodType<T>,
  image: { mimeType: string; data: string },
): Promise<AiJsonResult<T>> {
  const ai = getClient();
  if (!ai) return { data: null, usedGemini: false, error: NOT_CONFIGURED };
  try {
    const response = await ai.models.generateContent({
      model: config.geminiModel,
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                `${prompt}\n\n${AI_GROUND_RULES}\n\n` +
                `Respond with a single JSON object only. No prose, no markdown fences.`,
            },
            { inlineData: { mimeType: image.mimeType, data: image.data } },
          ],
        },
      ],
      config: { responseMimeType: "application/json", temperature: 0.1 },
    });
    const text = response.text ?? "";
    const parsed = extractJson(text);
    const result = schema.safeParse(parsed);
    if (result.success) return { data: result.data, usedGemini: true };
    return {
      data: null,
      usedGemini: true,
      error: sanitize(
        result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      ),
    };
  } catch (err) {
    const friendly = describeAiError(err);
    console.warn("[ecoguard] Gemini vision generation failed:", friendly);
    return { data: null, usedGemini: false, error: friendly };
  }
}
