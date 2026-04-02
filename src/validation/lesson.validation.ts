import { z } from "zod";

export const createLessonSchema = z
  .object({
    moduleId: z.string().min(1, "moduleId is required"),
    titleEn: z.string().min(1, "titleEn is required"),
    titleFil: z.string().min(1, "titleFil is required"),
    bodyEn: z.string().optional(),
    bodyFil: z.string().optional(),
    youtubeId: z.string().optional(),
    mp4Url: z.string().url("mp4Url must be a valid URL").optional(),
    durationSecs: z.number().int().min(0).optional(),
    order: z.number().int().min(0).optional(),
    bannerUrl: z.string().nullable().optional(),
    bannerFileId: z.string().nullable().optional(),
    status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  })
  .strict();

export const updateLessonSchema = z
  .object({
    titleEn: z.string().min(1).optional(),
    titleFil: z.string().min(1).optional(),
    bodyEn: z.string().nullable().optional(),
    bodyFil: z.string().nullable().optional(),
    youtubeId: z.string().nullable().optional(),
    mp4Url: z.string().url("mp4Url must be a valid URL").nullable().optional(),
    durationSecs: z.number().int().min(0).nullable().optional(),
    order: z.number().int().min(0).optional(),
    status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
    requiresPrevious: z.boolean().optional(),
    bannerUrl: z.string().nullable().optional(),
    bannerFileId: z.string().nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });
