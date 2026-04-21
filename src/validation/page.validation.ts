import { z } from "zod";

export const createPageSchema = z
  .object({
    moduleId: z.string().min(1),
    kind: z.enum(["LESSON", "COVER", "RESOURCE"]).optional(),
    titleEn: z.string().min(1),
    titleFil: z.string().min(1),
    slug: z.string().optional(),
    durationSecs: z.number().int().min(0).optional(),
    order: z.number().int().min(0).optional(),
    bannerUrl: z.string().nullable().optional(),
    bannerFileId: z.string().nullable().optional(),
    status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  })
  .strict();

export const updatePageSchema = z
  .object({
    titleEn: z.string().min(1).optional(),
    titleFil: z.string().min(1).optional(),
    slug: z.string().nullable().optional(),
    durationSecs: z.number().int().min(0).nullable().optional(),
    order: z.number().int().min(0).optional(),
    status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
    requiresPrevious: z.boolean().optional(),
    bannerUrl: z.string().nullable().optional(),
    bannerFileId: z.string().nullable().optional(),
    kind: z.enum(["LESSON", "COVER", "RESOURCE"]).optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: "At least one field must be provided" });

export const reorderPagesSchema = z
  .object({
    updates: z
      .array(z.object({ id: z.string().min(1), order: z.number().int().min(0) }))
      .min(1),
  })
  .strict();
