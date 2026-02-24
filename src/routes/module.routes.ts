import { Router } from "express";
import * as course from "@/controllers/course.controller";
import { authenticate, requireAdmin } from "@/middleware/auth.middleware";

const router = Router();

// Get a single module (students + admins)
router.get("/:id", authenticate, course.getModule);

// Admin-only module CRUD
router.post("/", authenticate, requireAdmin, course.createModule);
router.patch("/:id", authenticate, requireAdmin, course.updateModule);
router.delete("/:id", authenticate, requireAdmin, course.deleteModule);

export default router;
