import { Response } from "express";
import { AuthenticatedRequest } from "@/types";
import { param } from "@/utils/helpers";
import { badRequest, created, notFound, ok, serverError } from "@/utils/reponse";
import { pageService } from "@/services/page.service";
import {
  createPageSchema,
  updatePageSchema,
  reorderPagesSchema,
} from "@/validation/page.validation";

export const listPages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pages = await pageService.listByModule(param(req.params.moduleId));
    return ok(res, pages);
  } catch (err: any) {
    return serverError(res, err.message, "INTERNAL_ERROR");
  }
};

export const getPage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = await pageService.getWithBlocks(param(req.params.pageId));
    if (!page) return notFound(res, "Page not found");
    return ok(res, page);
  } catch (err: any) {
    return serverError(res, err.message, "INTERNAL_ERROR");
  }
};

export const createPage = async (req: AuthenticatedRequest, res: Response) => {
  const parsed = createPageSchema.safeParse({
    ...req.body,
    moduleId: req.params.moduleId ?? req.body.moduleId,
  });
  if (!parsed.success) return badRequest(res, parsed.error.message, "VALIDATION_ERROR");
  try {
    const page = await pageService.create(parsed.data);
    return created(res, page);
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};

export const updatePage = async (req: AuthenticatedRequest, res: Response) => {
  const parsed = updatePageSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error.message, "VALIDATION_ERROR");
  try {
    const page = await pageService.update(param(req.params.pageId), parsed.data);
    return ok(res, page);
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};

export const deletePage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await pageService.softDelete(param(req.params.pageId));
    return ok(res, { deleted: true });
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};

export const getPageProgress = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const progress = await pageService.getProgress(userId, param(req.params.pageId));
    return ok(res, progress ?? null);
  } catch (err: any) {
    return serverError(res, err.message, "INTERNAL_ERROR");
  }
};

export const completePage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const progress = await pageService.markComplete(userId, param(req.params.pageId));
    return ok(res, progress);
  } catch (err: any) {
    if (err.status === 404) return notFound(res, err.message);
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};

export const reorderPages = async (req: AuthenticatedRequest, res: Response) => {
  const parsed = reorderPagesSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error.message, "VALIDATION_ERROR");
  try {
    await pageService.reorder(param(req.params.moduleId), parsed.data.updates);
    return ok(res, { reordered: parsed.data.updates.length });
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};
