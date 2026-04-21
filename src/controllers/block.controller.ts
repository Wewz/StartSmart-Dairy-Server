import { Response } from "express";
import { AuthenticatedRequest } from "@/types";
import { param } from "@/utils/helpers";
import { badRequest, created, ok, serverError } from "@/utils/reponse";
import { blockService } from "@/services/block.service";
import {
  createBlockSchema,
  updateBlockSchema,
  reorderBlocksSchema,
  deleteBlockSchema,
  translateBlockSchema,
} from "@/validation/block.validation";

export const createBlock = async (req: AuthenticatedRequest, res: Response) => {
  const parsed = createBlockSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error.message, "VALIDATION_ERROR");
  try {
    const block = await blockService.createBlock(param(req.params.pageId), parsed.data);
    return created(res, block);
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};

export const updateBlock = async (req: AuthenticatedRequest, res: Response) => {
  const parsed = updateBlockSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error.message, "VALIDATION_ERROR");
  try {
    const block = await blockService.updateBlock(param(req.params.blockId), parsed.data);
    return ok(res, block);
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};

export const deleteBlock = async (req: AuthenticatedRequest, res: Response) => {
  const parsed = deleteBlockSchema.safeParse(req.body ?? {});
  if (!parsed.success) return badRequest(res, parsed.error.message, "VALIDATION_ERROR");
  try {
    await blockService.deleteBlock(param(req.params.blockId), parsed.data);
    return ok(res, { deleted: true });
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};

export const translateBlock = async (req: AuthenticatedRequest, res: Response) => {
  const parsed = translateBlockSchema.safeParse(req.body ?? {});
  if (!parsed.success) return badRequest(res, parsed.error.message, "VALIDATION_ERROR");
  try {
    const block = await blockService.translateBlock(
      param(req.params.blockId),
      parsed.data.fields,
    );
    return ok(res, block);
  } catch (err: any) {
    if (err.code === "RATE_LIMITED")
      return serverError(res, "Translation models are rate-limited — try again shortly.", "INTERNAL_ERROR");
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};

export const reorderBlocks = async (req: AuthenticatedRequest, res: Response) => {
  const parsed = reorderBlocksSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error.message, "VALIDATION_ERROR");
  try {
    await blockService.reorder(param(req.params.pageId), parsed.data.updates);
    return ok(res, { reordered: parsed.data.updates.length });
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};
