import { Router } from "express";
import * as moduleItem from "@/controllers/module-item.controller";
import { authenticate, requireAdmin } from "@/middleware/auth.middleware";
import { validateRequest } from "@/middleware/validate.middleware";
import { reorderModuleItemsSchema } from "@/validation/task.validation";

const router = Router();

router.get("/module/:moduleId", authenticate, moduleItem.listModuleItems);
router.patch(
  "/module/:moduleId/reorder",
  authenticate,
  requireAdmin,
  validateRequest({ body: reorderModuleItemsSchema }),
  moduleItem.reorderModuleItems,
);

export default router;
