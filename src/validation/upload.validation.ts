import { z } from "zod";

export const createUploadUrlSchema = z.object({
  folder: z.string().min(1).max(80).optional(),
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1),
});
