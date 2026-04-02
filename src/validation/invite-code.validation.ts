import { z } from "zod";

export const createInviteCodeSchema = z
  .object({
    code: z
      .string()
      .min(4)
      .max(40)
      .regex(/^[A-Z0-9\-]+$/, "Code must be uppercase alphanumeric with hyphens")
      .optional(),
    bundleName: z.string().max(120).nullish(),
    courseIds: z.array(z.string().min(1)).min(1, "At least one course required"),
    usageLimit: z.number().int().min(1).nullish(),
    expiresAt: z.string().nullish(),
    note: z.string().max(250).nullish(),
  })
  .strict();

export const updateInviteCodeSchema = z
  .object({
    bundleName: z.string().max(120).nullable().optional(),
    courseIds: z.array(z.string().min(1)).min(1).optional(),
    usageLimit: z.number().int().min(1).nullable().optional(),
    expiresAt: z.string().nullish(),
    note: z.string().max(250).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const redeemCodeSchema = z
  .object({
    code: z.string().min(1),
    confirm: z.boolean().optional().default(false),
  })
  .strict();

export type CreateInviteCodeDto = z.infer<typeof createInviteCodeSchema>;
export type UpdateInviteCodeDto = z.infer<typeof updateInviteCodeSchema>;
export type RedeemCodeDto = z.infer<typeof redeemCodeSchema>;
