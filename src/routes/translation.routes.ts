import { Router } from "express";
import { authenticate, requireAdmin } from "@/middleware/auth.middleware";
import { validateRequest } from "@/middleware/validate.middleware";
import { translateSchema } from "@/validation/translation.validation";
import * as translation from "@/controllers/translation.controller";

const router = Router();

router.post(
  "/",
  authenticate,
  requireAdmin,
  validateRequest({ body: translateSchema }),
  translation.translateText,
);

export default router;
