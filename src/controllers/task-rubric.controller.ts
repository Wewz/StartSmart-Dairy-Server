import { Response } from "express";
import { AuthenticatedRequest } from "@/types";
import { ok, created, badRequest, notFound, serverError } from "@/utils/reponse";
import { param } from "@/utils/helpers";
import { taskRubricService } from "@/services/task-rubric.service";
import {
  createCriterionSchema,
  updateCriterionSchema,
  reorderCriteriaSchema,
  gradeSubmissionSchema,
} from "@/validation/task-rubric.validation";

export const getCriteria = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const criteria = await taskRubricService.getCriteria(param(req.params.taskId));
    return ok(res, criteria);
  } catch (err: any) {
    return serverError(res, err.message);
  }
};

export const addCriterion = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = createCriterionSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error.message);

    const criterion = await taskRubricService.addCriterion(
      param(req.params.taskId),
      parsed.data,
    );
    return created(res, criterion);
  } catch (err: any) {
    if (err.message === "Task not found") return notFound(res, err.message);
    return badRequest(res, err.message);
  }
};

export const updateCriterion = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = updateCriterionSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error.message);

    const criterion = await taskRubricService.updateCriterion(
      param(req.params.criterionId),
      parsed.data,
    );
    return ok(res, criterion);
  } catch (err: any) {
    if (err.message === "Criterion not found") return notFound(res, err.message);
    return badRequest(res, err.message);
  }
};

export const deleteCriterion = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await taskRubricService.deleteCriterion(param(req.params.criterionId));
    return ok(res, null, "Criterion deleted");
  } catch (err: any) {
    if (err.message === "Criterion not found") return notFound(res, err.message);
    return serverError(res, err.message);
  }
};

export const reorderCriteria = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = reorderCriteriaSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error.message);

    const result = await taskRubricService.reorderCriteria(
      param(req.params.taskId),
      parsed.data.orderedIds,
    );
    return ok(res, result);
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const gradeSubmission = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = gradeSubmissionSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error.message);

    const result = await taskRubricService.gradeSubmission(
      param(req.params.submissionId),
      parsed.data,
    );
    return ok(res, result);
  } catch (err: any) {
    if (err.message === "Submission not found") return notFound(res, err.message);
    return badRequest(res, err.message);
  }
};
