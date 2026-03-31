import { z } from "zod";

export const submitQuizSchema = z
  .object({
    quizId: z.string().min(1, "quizId is required"),
    answers: z
      .array(
        z.object({
          questionId: z.string().min(1, "questionId is required"),
          selectedOptionId: z.string().min(1).optional(),
          textAnswer: z.string().optional(),
        }),
      )
      .min(1, "At least one answer is required"),
  })
  .strict();

export const createQuizSchema = z
  .object({
    moduleId: z.string().min(1, "moduleId is required"),
    type: z.enum(["PRE_TEST", "POST_TEST", "FORMATIVE"]),
    titleEn: z.string().min(1).optional(),
    titleFil: z.string().min(1).optional(),
    passingScore: z.number().int().min(0).max(100).optional(),
    maxAttempts: z.number().int().min(1).optional(),
    timeLimitMin: z.number().int().min(1).optional(),
    blocksProgress: z.boolean().optional(),
    questions: z
      .array(
        z
          .object({
            textEn: z.string().min(1, "Question textEn is required"),
            textFil: z.string().optional(),
            order: z.number().int().min(0).optional(),
            points: z.number().int().min(1).optional(),
            options: z
              .array(
                z.object({
                  textEn: z.string().min(1, "Option textEn is required"),
                  textFil: z.string().optional(),
                  isCorrect: z.boolean(),
                  order: z.number().int().min(0).optional(),
                }),
              )
              .optional(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

export const updateQuizSchema = z
  .object({
    titleEn: z.string().min(1).optional(),
    titleFil: z.string().min(1).optional(),
    passingScore: z.number().int().min(0).max(100).optional(),
    maxAttempts: z.number().int().min(1).optional(),
    timeLimitMin: z.number().int().min(1).nullable().optional(),
    blocksProgress: z.boolean().optional(),
    isPublished: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });
