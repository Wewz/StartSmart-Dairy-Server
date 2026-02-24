import { Router } from "express";
import * as course from "@/controllers/course.controller";
import { authenticate, requireAdmin } from "@/middleware/auth.middleware";

const router = Router();

router.get("/:id", authenticate, course.getLesson);
router.post("/", authenticate, requireAdmin, course.createLesson);
router.patch("/:id", authenticate, requireAdmin, course.updateLesson);
router.delete("/:id", authenticate, requireAdmin, course.deleteLesson);

export default router;
