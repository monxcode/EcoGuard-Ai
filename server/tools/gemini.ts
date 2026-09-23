import { GoogleGenAI } from "@google/genai";
import type { ZodType } from "zod";
import { config, geminiConfigured } from "../config/env";

export interface AiTextResult {
  text: string;
  usedGemini: boolean;
}

export interface AiJsonResult<T> {
  data: T | null;
  usedGemini: boolean;
  error?: string;
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  if (!geminiConfigured || !config.geminiApiKey) return null;
  if (!client) client = new GoogleGenAI({ apiKey: config.geminiApiKey });
  return client;
}

export function aiAvailable(): boolean {
  return getClient() !== null;
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
  if (!ai) return { data: null, usedGemini: false, error: "Gemini not configured" };

  let lastError = "unknown error";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const attemptPrompt =
      attempt === 0
        ? `${prompt}\n\nRespond with a single JSON object only. No prose, no markdown fences.`
        : `${prompt}\n\nYour previous response was invalid JSON or failed validation (${lastError}). ` +
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
      lastError = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  return { data: null, usedGemini: true, error: lastError };
}

/** Free-form text generation; returns null-ish result on failure for fallbacks. */
export async function generateText(prompt: string): Promise<AiTextResult | null> {
  const ai = getClient();
  if (!ai) return null;
  try {
    const response = await ai.models.generateContent({
      model: config.geminiModel,
      contents: prompt,
      config: { temperature: 0.3 },
    });
    const text = (response.text ?? "").trim();
    if (!text) return null;
    return { text, usedGemini: true };
  } catch (err) {
    console.warn("[ecoguard] Gemini text generation failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Validated JSON generation with an inline image part (vision). */
export async function generateValidatedJsonWithImage<T>(
  prompt: string,
  schema: ZodType<T>,
  image: { mimeType: string; data: string },
): Promise<AiJsonResult<T>> {
  const ai = getClient();
  if (!ai) return { data: null, usedGemini: false, error: "Gemini not configured" };
  try {
    const response = await ai.models.generateContent({
      model: config.geminiModel,
      contents: [
        {
          role: "user",
          parts: [
            { text: `${prompt}\n\nRespond with a single JSON object only. No prose, no markdown fences.` },
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
      error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    };
  } catch (err) {
    return { data: null, usedGemini: true, error: err instanceof Error ? err.message : String(err) };
  }
}
