import { z } from "zod";

export const createLessonSectionSchema = z
  .object({
    headingEn: z.string().min(1, "headingEn is required"),
    headingFil: z.string().optional(),
    bodyEn: z.string().optional(),
    bodyFil: z.string().optional(),
    imageUrl: z.string().url().optional().nullable(),
    imageFileId: z.string().optional().nullable(),
    imageAltEn: z.string().optional(),
    imageAltFil: z.string().optional(),
    youtubeId: z.string().optional().nullable(),
    mp4Url: z.string().optional().nullable(),
    videoPosition: z.enum(["ABOVE_BODY", "BELOW_BODY"]).optional(),
    order: z.number().int().min(0).optional(),
  })
  .strict();

export const updateLessonSectionSchema = createLessonSectionSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const reorderLessonSectionsSchema = z
  .object({
    orderedIds: z.array(z.string().min(1)).min(1),
  })
  .strict();

export const upsertTranscriptSchema = z
  .object({
    content: z.string().min(1, "content is required"),
    source: z.string().optional(),
    generatedByAi: z.boolean().optional(),
  })
  .strict();

export const transcriptLanguageParamSchema = z
  .object({
    language: z.enum(["ENGLISH", "FILIPINO"]),
  })
  .strict();
