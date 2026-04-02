import { z } from "zod";

export const createTaskSchema = z.object({
  moduleId: z.string().min(1),
  titleEn: z.string().min(1),
  titleFil: z.string().optional(),
  descriptionEn: z.string().optional(),
  descriptionFil: z.string().optional(),
  taskType: z.enum(["OUTPUT_SUBMISSION", "REFLECTION", "ACTIVITY"]),
  maxScore: z.number().int().positive().optional(),
  dueAt: z.string().datetime().optional(),
  isRequired: z.boolean().optional(),
  requiresReview: z.boolean().optional(),
  allowResubmission: z.boolean().optional(),
  youtubeId: z.string().nullish(),
});

export const updateTaskSchema = createTaskSchema
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field is required",
  );

export const submitTaskSchema = z.object({
  submissionText: z.string().optional(),
  submissionUrl: z.string().url().optional(),
  submissionFileId: z.string().optional(),
});

export const reviewTaskSubmissionSchema = z.object({
  status: z.enum(["REVIEWED", "RETURNED"]),
  score: z.number().int().nonnegative().optional(),
  feedback: z.string().optional(),
});

export const reorderModuleItemsSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});
