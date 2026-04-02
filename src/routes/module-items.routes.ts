import { Router } from "express";
import * as moduleItem from "@/controllers/module-item.controller";
import { authenticate, requireAdmin } from "@/middleware/auth.middleware";
import { validateRequest } from "@/middleware/validate.middleware";
import { reorderModuleItemsSchema } from "@/validation/task.validation";
import {
  addModuleItemSchema,
  restoreModuleItemSchema,
} from "@/validation/module-item.validation";

const router = Router();

router.get("/module/:moduleId", authenticate, moduleItem.listModuleItems);
router.get(
  "/module/:moduleId/archived",
  authenticate,
  requireAdmin,
  moduleItem.listArchivedModuleItems,
);
router.post(
  "/module/:moduleId",
  authenticate,
  requireAdmin,
  validateRequest({ body: addModuleItemSchema }),
  moduleItem.addModuleItem,
);
router.post(
  "/module/:moduleId/restore",
  authenticate,
  requireAdmin,
  validateRequest({ body: restoreModuleItemSchema }),
  moduleItem.restoreModuleItem,
);
router.patch(
  "/module/:moduleId/reorder",
  authenticate,
  requireAdmin,
  validateRequest({ body: reorderModuleItemsSchema }),
  moduleItem.reorderModuleItems,
);
router.delete("/:id", authenticate, requireAdmin, moduleItem.deleteModuleItem);

// Inline lesson embedding
router.get("/lesson/:lessonId/inline", authenticate, requireAdmin, moduleItem.getInlineItems);
router.patch("/lesson/:lessonId/inline/reorder", authenticate, requireAdmin, moduleItem.reorderInlineItems);
router.patch("/:id/inline", authenticate, requireAdmin, moduleItem.setInlineLesson);

export default router;
