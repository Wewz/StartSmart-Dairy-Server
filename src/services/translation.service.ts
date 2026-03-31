import { GoogleGenerativeAI } from "@google/generative-ai";

// Fallback chain: primary → fallback → lite
const MODEL_CHAIN = [
  "gemini-2.0-flash",
  "gemini-2.5-flash-preview-05-20",
  "gemini-2.0-flash-lite",
];

const LANGUAGE_NAME: Record<string, string> = {
  en: "English",
  fil: "Filipino (Tagalog)",
};

function getClient(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenerativeAI(key);
}

function buildPrompt(
  text: string,
  from: string,
  to: string,
  format: "plain" | "html",
): string {
  const fromLang = LANGUAGE_NAME[from] ?? from;
  const toLang = LANGUAGE_NAME[to] ?? to;

  if (format === "html") {
    return [
      `Translate the following HTML content from ${fromLang} to ${toLang}.`,
      `Preserve ALL HTML tags, attributes, and structure exactly as they are.`,
      `Only translate the visible text content between tags.`,
      `Return ONLY the translated HTML — no markdown fences, no explanation.\n`,
      text,
    ].join("\n");
  }

  return [
    `Translate the following text from ${fromLang} to ${toLang}.`,
    `Return ONLY the translated text — no markdown fences, no explanation.\n`,
    text,
  ].join("\n");
}

function isRateLimitError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("rate") ||
    msg.includes("quota") ||
    msg.includes("resource_exhausted")
  );
}

function stripFences(text: string): string {
  // Remove ```html ... ``` or ``` ... ``` wrappers
  return text.replace(/^```(?:html)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
}

export async function translate(
  text: string,
  from: "en" | "fil",
  to: "en" | "fil",
  format: "plain" | "html" = "plain",
): Promise<string> {
  const client = getClient();
  const prompt = buildPrompt(text, from, to, format);
  const errors: Error[] = [];

  for (const modelName of MODEL_CHAIN) {
    try {
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      return stripFences(response);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      errors.push(error);

      // If it's not a rate limit, still try next model (defensive)
      if (!isRateLimitError(err)) {
        console.error(`Gemini ${modelName} error:`, error.message);
      }
      continue;
    }
  }

  // All models failed — check if any was rate-limited
  const anyRateLimit = errors.some(isRateLimitError);
  if (anyRateLimit) {
    const err = new Error("All translation models are rate-limited");
    (err as any).code = "RATE_LIMITED";
    throw err;
  }

  throw new Error(
    `Translation failed on all models: ${errors.map((e) => e.message).join("; ")}`,
  );
}
