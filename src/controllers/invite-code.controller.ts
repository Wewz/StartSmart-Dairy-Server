import { Response } from "express";
import { AuthenticatedRequest } from "@/types";
import { ok, created, badRequest, notFound, serverError } from "@/utils/reponse";
import { param } from "@/utils/helpers";
import { inviteCodeService } from "@/services/invite-code.service";
import {
  createInviteCodeSchema,
  updateInviteCodeSchema,
  redeemCodeSchema,
} from "@/validation/invite-code.validation";

export const listInviteCodes = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const courseId = req.query.courseId as string | undefined;
    const codes = await inviteCodeService.list(courseId);
    return ok(res, codes);
  } catch (err: any) {
    return serverError(res, err.message);
  }
};

export const createInviteCode = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = createInviteCodeSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error.message);

    const code = await inviteCodeService.create(parsed.data, req.user!.userId);
    return created(res, code);
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const updateInviteCode = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = updateInviteCodeSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error.message);

    const code = await inviteCodeService.update(param(req.params.id), parsed.data);
    return ok(res, code);
  } catch (err: any) {
    if (err.message === "Invite code not found") return notFound(res, err.message);
    return badRequest(res, err.message);
  }
};

export const redeemInviteCode = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = redeemCodeSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error.message);

    const result = await inviteCodeService.redeem(
      req.user!.userId,
      parsed.data.code,
      parsed.data.confirm ?? false,
    );
    return ok(res, result);
  } catch (err: any) {
    const userErrors = [
      "Invalid or inactive invite code",
      "Invite code expired",
      "Invite code limit reached",
    ];
    if (userErrors.includes(err.message)) return badRequest(res, err.message);
    return serverError(res, err.message);
  }
};
