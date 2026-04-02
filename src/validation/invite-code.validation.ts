import { z } from "zod";

export const createInviteCodeSchema = z
  .object({
    code: z
      .string()
      .min(4)
      .max(40)
      .regex(/^[A-Z0-9\-]+$/, "Code must be uppercase alphanumeric with hyphens")
      .optional(), // if omitted, auto-generated
    bundleName: z.string().max(120).optional(),
    courseIds: z.array(z.string().min(1)).min(1, "At least one course required"),
    usageLimit: z.number().int().min(1).optional(),
    expiresAt: z.string().datetime().optional(),
    note: z.string().max(250).optional(),
  })
  .strict();

export const updateInviteCodeSchema = z
  .object({
    bundleName: z.string().max(120).nullable().optional(),
    courseIds: z.array(z.string().min(1)).min(1).optional(),
    usageLimit: z.number().int().min(1).nullable().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
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
