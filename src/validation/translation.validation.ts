import { z } from "zod";

export const translateSchema = z.object({
  text: z.string().min(1).max(50000),
  from: z.enum(["en", "fil"]),
  to: z.enum(["en", "fil"]),
  format: z.enum(["plain", "html"]).default("plain"),
});
