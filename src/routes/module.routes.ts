import { Router } from "express";
import * as course from "../controllers/course.controller";
import { authenticate, requireInstructor } from "../middleware/auth.middleware";

const router = Router();

// Modules
router.post("/", authenticate, requireInstructor, course.createModule);
router.patch("/:id", authenticate, requireInstructor, course.updateModule);
router.delete("/:id", authenticate, requireInstructor, course.deleteModule);

export default router;