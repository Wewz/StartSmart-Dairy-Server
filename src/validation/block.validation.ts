import { z } from "zod";

export const blockTypes = [
  "HEADING",
  "PARAGRAPH",
  "IMAGE",
  "VIDEO",
  "FILE",
  "DIVIDER",
  "CALLOUT",
  "TASK_REF",
  "QUIZ_REF",
  "EMBED",
] as const;

export const createBlockSchema = z
  .object({
    type: z.enum(blockTypes),
    order: z.number().int().min(0).optional(),
    // Text
    headingLevel: z.number().int().min(1).max(3).optional(),
    textEn: z.string().optional(),
    textFil: z.string().optional(),
    altEn: z.string().optional(),
    altFil: z.string().optional(),
    captionEn: z.string().optional(),
    captionFil: z.string().optional(),
    // Media
    imageUrl: z.string().url().optional(),
    imageFileId: z.string().optional(),
    youtubeId: z.string().optional(),
    mp4Url: z.string().url().optional(),
    fileUrl: z.string().url().optional(),
    fileId: z.string().optional(),
    fileType: z.enum(["PDF", "IMAGE", "VIDEO", "AUDIO", "OTHER"]).optional(),
    fileSizeBytes: z.number().int().min(0).optional(),
    mimeType: z.string().optional(),
    originalName: z.string().optional(),
    // Callout / embed
    calloutStyle: z.enum(["INFO", "TIP", "WARNING", "NOTE"]).optional(),
    embedUrl: z.string().url().optional(),
    // TASK_REF / QUIZ_REF — initial ref payload
    taskInit: z
      .object({
        titleEn: z.string().min(1),
        titleFil: z.string().optional(),
        taskType: z.enum(["OUTPUT_SUBMISSION", "REFLECTION", "ACTIVITY"]).optional(),
      })
      .optional(),
    quizInit: z
      .object({
        titleEn: z.string().min(1),
        titleFil: z.string().optional(),
        quizType: z.enum(["PRE_TEST", "POST_TEST", "FORMATIVE"]).optional(),
      })
      .optional(),
  })
  .strict();

export const updateBlockSchema = z
  .object({
    headingLevel: z.number().int().min(1).max(3).nullable().optional(),
    textEn: z.string().nullable().optional(),
    textFil: z.string().nullable().optional(),
    altEn: z.string().nullable().optional(),
    altFil: z.string().nullable().optional(),
    captionEn: z.string().nullable().optional(),
    captionFil: z.string().nullable().optional(),
    imageUrl: z.string().url().nullable().optional(),
    imageFileId: z.string().nullable().optional(),
    youtubeId: z.string().nullable().optional(),
    mp4Url: z.string().url().nullable().optional(),
    fileUrl: z.string().url().nullable().optional(),
    fileId: z.string().nullable().optional(),
    fileType: z.enum(["PDF", "IMAGE", "VIDEO", "AUDIO", "OTHER"]).nullable().optional(),
    fileSizeBytes: z.number().int().min(0).nullable().optional(),
    mimeType: z.string().nullable().optional(),
    originalName: z.string().nullable().optional(),
    calloutStyle: z.enum(["INFO", "TIP", "WARNING", "NOTE"]).nullable().optional(),
    embedUrl: z.string().url().nullable().optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: "At least one field must be provided" });

export const reorderBlocksSchema = z
  .object({
    updates: z
      .array(z.object({ id: z.string().min(1), order: z.number().int().min(0) }))
      .min(1),
  })
  .strict();

export const deleteBlockSchema = z
  .object({
    cascadeModuleItem: z.boolean().optional(),
  })
  .strict();

export const translateBlockSchema = z
  .object({
    fields: z
      .array(z.enum(["textFil", "altFil", "captionFil"]))
      .min(1)
      .optional(),
  })
  .strict();
