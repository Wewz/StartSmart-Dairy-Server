// output.controller.ts
import { Response } from "express";
import { outputService } from "../services/output.service";
import { AuthenticatedRequest } from "../types";
import { ok, created, badRequest, serverError } from "../utils/reponse";

export const submitOutput = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const output = await outputService.submitOutput(req.user!.userId, req.body);
    return created(res, output, "Output submitted");
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const getMyOutputs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const outputs = await outputService.getMyOutputs(req.user!.userId);
    return ok(res, outputs);
  } catch (err: any) {
    return serverError(res, err.message);
  }
};

export const getAllOutputs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const status = req.query.status as string | undefined;
    const data = await outputService.getAllOutputs(page, limit, status);
    return ok(res, data);
  } catch (err: any) {
    return serverError(res, err.message);
  }
};

export const reviewOutput = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const output = await outputService.reviewOutput(req.params.id, req.user!.userId, req.body);
    return ok(res, output);
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};