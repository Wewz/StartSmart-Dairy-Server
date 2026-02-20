import { Router } from "express";
import * as course from "../controllers/course.controller";
import { authenticate, requireInstructor } from "../middleware/auth.middleware";

const router = Router();

router.get("/:id", authenticate, course.getLesson);
router.post("/", authenticate, requireInstructor, course.createLesson);
router.patch("/:id", authenticate, requireInstructor, course.updateLesson);
router.delete("/:id", authenticate, requireInstructor, course.deleteLesson);

export default router;