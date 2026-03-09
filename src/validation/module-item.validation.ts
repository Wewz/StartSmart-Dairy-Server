import { z } from "zod";

export const addModuleItemSchema = z.union([
  z.object({
    itemType: z.literal("LESSON"),
    lessonId: z.string().min(1),
  }),
  z.object({
    itemType: z.literal("QUIZ"),
    quizId: z.string().min(1),
  }),
  z.object({
    itemType: z.literal("TASK"),
    taskId: z.string().min(1),
  }),
]);

export const restoreModuleItemSchema = addModuleItemSchema;
