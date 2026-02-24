import { Response } from "express";
import { notificationService } from "@/services/notification.service";
import { AuthenticatedRequest } from "@/types";
import { ok, serverError } from "@/utils/reponse";
import { param } from "@/utils/helpers";

export const getNotifications = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const data = await notificationService.getNotifications(
      req.user!.userId,
      page,
      limit,
    );
    return ok(res, data);
  } catch (err: any) {
    return serverError(res, err.message);
  }
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await notificationService.markAsRead(
      param(req.params.id),
      req.user!.userId,
    );
    return ok(res, null, "Marked as read");
  } catch (err: any) {
    return serverError(res, err.message);
  }
};

export const markAllAsRead = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    await notificationService.markAllAsRead(req.user!.userId);
    return ok(res, null, "All notifications marked as read");
  } catch (err: any) {
    return serverError(res, err.message);
  }
};
