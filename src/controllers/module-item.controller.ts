import { Response } from "express";
import { AuthenticatedRequest } from "@/types";
import { moduleItemService } from "@/services/module-item.service";
import { badRequest, ok, serverError } from "@/utils/reponse";
import { param } from "@/utils/helpers";

export const listModuleItems = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const items = await moduleItemService.listModuleItems(
      param(req.params.moduleId),
      req.user!.role,
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
