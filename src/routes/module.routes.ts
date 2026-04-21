import { Router } from "express";
import * as course from "@/controllers/course.controller";
import * as page from "@/controllers/page.controller";
import { authenticate, requireAdmin } from "@/middleware/auth.middleware";

const router = Router();

// Get a single module (students + admins)
router.get("/:id", authenticate, course.getModule);

// Admin-only module CRUD
router.post("/", authenticate, requireAdmin, course.createModule);
router.patch("/:id", authenticate, requireAdmin, course.updateModule);
router.delete("/:id", authenticate, requireAdmin, course.deleteModule);

// Pages (block-editor) scoped under module
router.get("/:moduleId/pages", authenticate, page.listPages);
router.post("/:moduleId/pages", authenticate, requireAdmin, page.createPage);
router.post(
  "/:moduleId/pages/reorder",
  authenticate,
  requireAdmin,
  page.reorderPages,
);

export default router;
