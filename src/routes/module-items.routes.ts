import { Router } from "express";
import * as moduleItem from "@/controllers/module-item.controller";
import { authenticate, requireAdmin } from "@/middleware/auth.middleware";
import { validateRequest } from "@/middleware/validate.middleware";
import { reorderModuleItemsSchema } from "@/validation/task.validation";
import { addModuleItemSchema } from "@/validation/module-item.validation";

const router = Router();

router.get("/module/:moduleId", authenticate, moduleItem.listModuleItems);
router.post(
  "/module/:moduleId",
  authenticate,
  requireAdmin,
  validateRequest({ body: addModuleItemSchema }),
  moduleItem.addModuleItem,
);
router.patch(
  "/module/:moduleId/reorder",
  authenticate,
  requireAdmin,
  validateRequest({ body: reorderModuleItemsSchema }),
  moduleItem.reorderModuleItems,
);
router.delete("/:id", authenticate, requireAdmin, moduleItem.deleteModuleItem);

export default router;
