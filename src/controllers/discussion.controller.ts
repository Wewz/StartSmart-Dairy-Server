import { Response } from "express";
import { discussionService } from "../services/discussion.service";
import { AuthenticatedRequest } from "../types";
import { ok, created, badRequest, notFound, serverError } from "../utils/reponse";

export const getThreads = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const data = await discussionService.getThreads(req.params.moduleId, page, limit);
    return ok(res, data);
  } catch (err: any) {
    return serverError(res, err.message);
  }
};

export const getThread = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const thread = await discussionService.getThread(req.params.id);
    return ok(res, thread);
  } catch (err: any) {
    return notFound(res, err.message);
  }
};

export const createThread = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const thread = await discussionService.createThread(req.user!.userId, req.body);
    return created(res, thread);
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const createReply = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reply = await discussionService.createReply(req.user!.userId, req.params.threadId, req.body);
    return created(res, reply);
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const deleteThread = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await discussionService.deleteThread(req.params.id, req.user!.userId, req.user!.role);
    return ok(res, null, "Thread deleted");
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const deleteReply = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await discussionService.deleteReply(req.params.id, req.user!.userId, req.user!.role);
    return ok(res, null, "Reply deleted");
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const pinThread = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const thread = await discussionService.pinThread(req.params.id, req.body.isPinned);
    return ok(res, thread);
  } catch (err: any) {
    return serverError(res, err.message);
  }
};