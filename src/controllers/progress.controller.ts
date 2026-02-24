// progress.controller.ts
import { Response } from "express";
import { progressService } from "@/services/progress.service";
import { AuthenticatedRequest } from "@/types";
import { ok, badRequest, serverError } from "@/utils/reponse";
import { param } from "@/utils/helpers";

export const updateProgress = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const progress = await progressService.updateLessonProgress(
      req.user!.userId,
      req.body,
    );
    return ok(res, progress);
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const getEnrollmentProgress = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const data = await progressService.getEnrollmentProgress(
      req.user!.userId,
      param(req.params.courseId),
    );
    return ok(res, data);
  } catch (err: any) {
    return serverError(res, err.message);
  }
};
