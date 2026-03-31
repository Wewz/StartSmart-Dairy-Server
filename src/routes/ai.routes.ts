import { Router } from "express";
import { authenticate, requireAdmin } from "@/middleware/auth.middleware";
import { validateRequest } from "@/middleware/validate.middleware";
import { transcribeSchema, gradeEssaySchema } from "@/validation/ai.validation";
import * as ai from "@/controllers/ai.controller";

const router = Router();

// AI transcription (YouTube captions → AI cleanup)
router.post(
  "/transcribe",
  authenticate,
  requireAdmin,
  validateRequest({ body: transcribeSchema }),
  ai.transcribeVideo,
);

// AI essay grading
router.post(
  "/grade-essay",
  authenticate,
  requireAdmin,
  validateRequest({ body: gradeEssaySchema }),
  ai.aiGradeEssay,
);

export default router;
