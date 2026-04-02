import { Router } from "express";
import { authenticate, requireAdmin } from "@/middleware/auth.middleware";
import * as rubric from "@/controllers/task-rubric.controller";

const router = Router();

// Task rubric criteria
router.get("/tasks/:taskId/rubric", authenticate, requireAdmin, rubric.getCriteria);
router.post("/tasks/:taskId/rubric", authenticate, requireAdmin, rubric.addCriterion);
router.patch("/tasks/:taskId/rubric/reorder", authenticate, requireAdmin, rubric.reorderCriteria);

// Individual criterion
router.patch("/rubric/:criterionId", authenticate, requireAdmin, rubric.updateCriterion);
router.delete("/rubric/:criterionId", authenticate, requireAdmin, rubric.deleteCriterion);

// Submission grading
router.post("/submissions/:submissionId/grade", authenticate, requireAdmin, rubric.gradeSubmission);

export default router;
