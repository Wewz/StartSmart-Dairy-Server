import { Router } from "express";
import { authenticate, requireAdmin } from "@/middleware/auth.middleware";
import * as timestamp from "@/controllers/timestamp.controller";

const router = Router();

// Lesson-scoped
router.get("/lessons/:lessonId/timestamps", authenticate, timestamp.listTimestamps);
router.post("/lessons/:lessonId/timestamps", authenticate, requireAdmin, timestamp.createTimestamp);
router.patch("/lessons/:lessonId/timestamps/reorder", authenticate, requireAdmin, timestamp.reorderTimestamps);
router.post("/lessons/:lessonId/timestamps/generate", authenticate, requireAdmin, timestamp.generateAiTimestamps);
router.post("/lessons/:lessonId/timestamps/bulk", authenticate, requireAdmin, timestamp.bulkSaveTimestamps);

// Individual timestamp
router.patch("/timestamps/:id", authenticate, requireAdmin, timestamp.updateTimestamp);
router.delete("/timestamps/:id", authenticate, requireAdmin, timestamp.deleteTimestamp);

export default router;
