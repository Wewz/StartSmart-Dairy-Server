import { Router } from "express";
import { authenticate } from "@/middleware/auth.middleware";
import * as upload from "@/controllers/upload.controller";
import { validateRequest } from "@/middleware/validate.middleware";
import { createUploadUrlSchema } from "@/validation/upload.validation";

const router = Router();

router.post(
  "/signed-url",
  authenticate,
  validateRequest({ body: createUploadUrlSchema }),
  upload.createUploadUrl,
);

export default router;
