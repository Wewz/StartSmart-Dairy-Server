import { Router } from "express";
import * as task from "@/controllers/task.controller";
import { authenticate, requireAdmin } from "@/middleware/auth.middleware";
import { validateRequest } from "@/middleware/validate.middleware";
import {
  createTaskSchema,
  reviewTaskSubmissionSchema,
  submitTaskSchema,
  updateTaskSchema,
} from "@/validation/task.validation";

const router = Router();

router.get("/module/:moduleId", authenticate, task.listModuleTasks);
router.get(
  "/submissions/pending",
  authenticate,
  requireAdmin,
  task.listPendingSubmissions,
);
router.get("/:taskId", authenticate, task.getTask);
router.post(
  "/",
  authenticate,
  requireAdmin,
  validateRequest({ body: createTaskSchema }),
  task.createTask,
);
router.patch(
  "/:id",
  authenticate,
  requireAdmin,
  validateRequest({ body: updateTaskSchema }),
  task.updateTask,
);
router.delete("/:id", authenticate, requireAdmin, task.deleteTask);
router.post("/:taskId/submissions", authenticate, validateRequest({ body: submitTaskSchema }), task.submitTask);
router.post("/:taskId/attachments", authenticate, requireAdmin, task.addAttachment);
router.delete("/:taskId/attachments/:attachmentId", authenticate, requireAdmin, task.deleteAttachment);
router.patch(
  "/submissions/:submissionId/review",
  authenticate,
  requireAdmin,
  validateRequest({ body: reviewTaskSubmissionSchema }),
  task.reviewTaskSubmission,
);

export default router;
