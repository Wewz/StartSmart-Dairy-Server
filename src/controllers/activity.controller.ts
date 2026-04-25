import { Response } from "express";
import { activityService } from "@/services/activity.service";
import { AuthenticatedRequest } from "@/types";
import { ok, serverError } from "@/utils/reponse";

export const logActivity = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await activityService.logActivity(req.user!.userId, req.body.minutesActive);
    return ok(res, null);
  } catch (e: any) {
    return serverError(res, e.message);
  }
};

export const getMyStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await activityService.getUserStats(req.user!.userId);
    return ok(res, stats);
  } catch (e: any) {
    return serverError(res, e.message);
  }
};

export const getMyHeatmap = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const weeks = parseInt(req.query.weeks as string) || 12;
    const data = await activityService.getHeatmap(req.user!.userId, weeks);
    return ok(res, data);
  } catch (e: any) {
    return serverError(res, e.message);
  }
};
