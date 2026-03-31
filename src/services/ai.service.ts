import { GoogleGenerativeAI } from "@google/generative-ai";
// @ts-expect-error — no type definitions for this package
import { getSubtitles } from "youtube-captions-scraper";

// Reuse the same model chain as translation
const MODEL_CHAIN = [
  "gemini-2.0-flash",
  "gemini-2.5-flash-preview-05-20",
  "gemini-2.0-flash-lite",
];

const CAPTION_CLEANUP_PROMPT = `You are a transcript formatter. The following are raw auto-generated captions from a video. Clean them up:
1. Fix obvious speech-to-text errors
2. Add proper punctuation and capitalization
3. Merge very short segments (< 2 seconds) into natural sentence groupings of 5-15 seconds
4. Output as a JSON array of { "start_time": "HH:MM:SS", "end_time": "HH:MM:SS", "text": "..." }
5. Do not include any text outside the JSON array.`;

function buildGradingPrompt(rubric: string, maxScore: number) {
  return `You are a strict but fair professor. Grade the following student essay based on the provided rubric.

Rubric:
${rubric}

Maximum Score: ${maxScore}

Output Requirements:
Return ONLY a JSON object with these keys:
- score: (integer, total out of ${maxScore})
- breakdown: { [criterion]: score } for each rubric criterion
- feedback: (A 2-3 sentence constructive critique for the student)
- status: ("Pass" if score >= ${Math.round(maxScore * 0.75)}, else "Fail")

Do not include any text outside the JSON object.`;
}

export type TranscriptEntry = {
  start_time: string;
  end_time: string;
  text: string;
};

export type EssayGradingResult = {
  score: number;
  breakdown: Record<string, number>;
  feedback: string;
  status: "Pass" | "Fail";
};

function getClient(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenerativeAI(key);
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
  return text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
}

function formatSeconds(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function generateWithFallback(
  prompt: string,
): Promise<{ text: string; modelUsed: string }> {
  const client = getClient();
  const errors: Error[] = [];

  for (const modelName of MODEL_CHAIN) {
    try {
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return { text: result.response.text(), modelUsed: modelName };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      errors.push(error);
      continue;
    }
  }

  const anyRateLimit = errors.some(isRateLimitError);
  if (anyRateLimit) {
    const err = new Error("All AI models are rate-limited");
    (err as any).code = "RATE_LIMITED";
    throw err;
  }

  throw new Error(
    `AI_ALL_MODELS_FAILED: ${errors.map((e) => e.message).join("; ")}`,
  );
}

// ─── YouTube Transcription ──────────────────────────────────────────────────

export async function transcribeYouTube(
  videoId: string,
  language: string = "en",
): Promise<{
  transcript: TranscriptEntry[];
  modelUsed: string | null;
  source: string;
}> {
  // Try target language, fallback to English
  let captions: Array<{ start: string; dur: string; text: string }>;
  try {
    captions = await getSubtitles({ videoID: videoId, lang: language });
  } catch {
    try {
      captions = await getSubtitles({ videoID: videoId, lang: "en" });
    } catch {
      throw new Error(
        "NO_CAPTIONS_AVAILABLE: This video has no auto-generated captions",
      );
    }
  }

  // Format raw captions
  const rawTranscript: TranscriptEntry[] = captions.map(
    (c: { start: string; dur: string; text: string }) => ({
      start_time: formatSeconds(parseFloat(c.start)),
      end_time: formatSeconds(parseFloat(c.start) + parseFloat(c.dur)),
      text: c.text,
    }),
  );

  // Optionally clean up with Gemini
  try {
    const prompt = `${CAPTION_CLEANUP_PROMPT}\n\n${JSON.stringify(rawTranscript)}`;
    const { text, modelUsed } = await generateWithFallback(prompt);
    const cleaned: TranscriptEntry[] = JSON.parse(stripFences(text));
    return { transcript: cleaned, modelUsed, source: "youtube_ai_cleaned" };
  } catch {
    // If AI cleanup fails, return raw captions (still usable)
    return { transcript: rawTranscript, modelUsed: null, source: "youtube_raw" };
  }
}

// ─── Essay Grading ──────────────────────────────────────────────────────────

export async function gradeEssay(
  essay: string,
  rubric: string,
  maxScore: number,
): Promise<{ grading: EssayGradingResult; modelUsed: string }> {
  const prompt = `${buildGradingPrompt(rubric, maxScore)}\n\nStudent Essay:\n${essay}`;
  const { text, modelUsed } = await generateWithFallback(prompt);
  const grading: EssayGradingResult = JSON.parse(stripFences(text));

  // Clamp score to valid range
  grading.score = Math.max(0, Math.min(maxScore, Math.round(grading.score)));

  return { grading, modelUsed };
}
