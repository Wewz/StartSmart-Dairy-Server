import { z } from "zod";

export const createCriterionSchema = z
  .object({
    titleEn: z.string().min(1).max(200),
    titleFil: z.string().max(200).optional(),
    descEn: z.string().max(2000).optional(),
    descFil: z.string().max(2000).optional(),
    maxPoints: z.number().int().min(1).max(100),
    order: z.number().int().min(0).optional(),
  })
  .strict();

export const updateCriterionSchema = z
  .object({
    titleEn: z.string().min(1).max(200).optional(),
    titleFil: z.string().max(200).nullable().optional(),
    descEn: z.string().max(2000).nullable().optional(),
    descFil: z.string().max(2000).nullable().optional(),
    maxPoints: z.number().int().min(1).max(100).optional(),
    order: z.number().int().min(0).optional(),
  })
  .strict();

export const reorderCriteriaSchema = z
  .object({
    orderedIds: z.array(z.string().min(1)).min(1),
  })
  .strict();

export const gradeSubmissionSchema = z
  .object({
    criterionScores: z.array(
      z.object({
        criterionId: z.string().min(1),
        score: z.number().int().min(0),
      }),
    ),
    feedback: z.string().max(5000).optional(),
  })
  .strict();

export type CreateCriterionDto = z.infer<typeof createCriterionSchema>;
export type UpdateCriterionDto = z.infer<typeof updateCriterionSchema>;
export type GradeSubmissionDto = z.infer<typeof gradeSubmissionSchema>;
