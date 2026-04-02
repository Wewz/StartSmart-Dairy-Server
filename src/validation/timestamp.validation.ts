import { z } from "zod";

export const createTimestampSchema = z
  .object({
    lessonId: z.string().min(1),
    lessonSectionId: z.string().optional(),
    timestampSecs: z.number().int().min(0),
    labelEn: z.string().min(1).max(200),
    labelFil: z.string().max(200).optional(),
    noteEn: z.string().max(2000).optional(),
    noteFil: z.string().max(2000).optional(),
    type: z.enum(["CHAPTER", "SUBTITLE", "DISCUSSION", "KEY_TERM"]).default("CHAPTER"),
    order: z.number().int().min(0).optional(),
  })
  .strict();

export const updateTimestampSchema = z
  .object({
    lessonSectionId: z.string().nullable().optional(),
    timestampSecs: z.number().int().min(0).optional(),
    labelEn: z.string().min(1).max(200).optional(),
    labelFil: z.string().max(200).nullable().optional(),
    noteEn: z.string().max(2000).nullable().optional(),
    noteFil: z.string().max(2000).nullable().optional(),
    type: z.enum(["CHAPTER", "SUBTITLE", "DISCUSSION", "KEY_TERM"]).optional(),
    order: z.number().int().min(0).optional(),
  })
  .strict();

export const reorderTimestampsSchema = z
  .object({
    orderedIds: z.array(z.string().min(1)).min(1),
  })
  .strict();

export const generateTimestampsSchema = z
  .object({
    language: z.enum(["en", "fil"]).default("en"),
    lessonSectionId: z.string().optional(),
  })
  .strict();

export const bulkSaveTimestampsSchema = z
  .object({
    timestamps: z.array(
      z.object({
        lessonSectionId: z.string().optional(),
        timestampSecs: z.number().int().min(0),
        labelEn: z.string().min(1).max(200),
        labelFil: z.string().max(200).optional(),
        noteEn: z.string().max(2000).optional(),
        noteFil: z.string().max(2000).optional(),
        type: z.enum(["CHAPTER", "SUBTITLE", "DISCUSSION", "KEY_TERM"]),
        order: z.number().int().min(0).optional(),
        generatedByAi: z.boolean().optional(),
      }),
    ).min(1),
    replacePrevious: z.boolean().optional().default(false),
  })
  .strict();

export type CreateTimestampDto = z.infer<typeof createTimestampSchema>;
export type UpdateTimestampDto = z.infer<typeof updateTimestampSchema>;
