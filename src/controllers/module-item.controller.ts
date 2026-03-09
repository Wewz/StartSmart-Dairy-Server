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
