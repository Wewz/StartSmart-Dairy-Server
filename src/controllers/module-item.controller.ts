import { Response } from "express";
import { AuthenticatedRequest } from "@/types";
import { moduleItemService } from "@/services/module-item.service";
import { badRequest, created, ok, serverError } from "@/utils/reponse";
import { param } from "@/utils/helpers";

export const listModuleItems = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const items = await moduleItemService.listModuleItems(
      param(req.params.moduleId),
      req.user!.role,
      req.user!.userId,
    );
    return ok(res, items);
  } catch (err: any) {
    return serverError(res, err.message, "INTERNAL_ERROR");
  }
};

export const reorderModuleItems = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const items = await moduleItemService.reorderModuleItems(
      param(req.params.moduleId),
      req.body.orderedIds,
    );
    return ok(res, items, "Module items reordered");
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};

export const listArchivedModuleItems = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const items = await moduleItemService.listArchivedModuleItems(
      param(req.params.moduleId),
    );
    return ok(res, items);
  } catch (err: any) {
    return serverError(res, err.message, "INTERNAL_ERROR");
  }
};

export const addModuleItem = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const item = await moduleItemService.addModuleItem(
      param(req.params.moduleId),
      req.body,
    );
    return created(res, item, "Module item added");
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};

export const restoreModuleItem = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const item = await moduleItemService.restoreArchivedModuleItem(
      param(req.params.moduleId),
      req.body,
    );
    return ok(res, item, "Archived item restored to flow");
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};

export const getInlineItems = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const items = await moduleItemService.getInlineItemsForLesson(
      param(req.params.lessonId),
    );
    return ok(res, items);
  } catch (err: any) {
    return serverError(res, err.message, "INTERNAL_ERROR");
  }
};

export const setInlineLesson = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { lessonId, inlineOrder } = req.body as {
      lessonId: string | null;
      inlineOrder?: number;
    };
    const item = await moduleItemService.setInlineLesson(
      param(req.params.id),
      lessonId ?? null,
      inlineOrder,
    );
    return ok(res, item);
  } catch (err: any) {
    if (err.message === "Module item not found") {
      return res
        .status(404)
        .json({ success: false, message: err.message, code: "NOT_FOUND" });
    }
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};

export const reorderInlineItems = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await moduleItemService.reorderInlineItems(
      param(req.params.lessonId),
      req.body.orderedIds,
    );
    return ok(res, result);
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};

export const deleteModuleItem = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await moduleItemService.deleteModuleItem(
      param(req.params.id),
    );
    return ok(
      res,
      result,
      result.archived
        ? "Item removed from flow and archived"
        : "Item removed from flow",
    );
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};
