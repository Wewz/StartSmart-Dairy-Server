import { z } from "zod";

export const transcribeSchema = z.object({
  lessonId: z.string().min(1),
  youtubeId: z.string().min(1),
  language: z.enum(["ENGLISH", "FILIPINO"]).default("ENGLISH"),
});

export const gradeEssaySchema = z.object({
  attemptAnswerId: z.string().min(1),
  questionId: z.string().min(1),
});
