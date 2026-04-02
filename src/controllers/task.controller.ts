import { Response } from "express";
import { AuthenticatedRequest } from "@/types";
import { param } from "@/utils/helpers";
import { badRequest, created, notFound, ok, serverError } from "@/utils/reponse";
import { taskService } from "@/services/task.service";

export const getTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const task = await taskService.getTask(
      param(req.params.taskId),
      req.user!.userId,
    );
    return ok(res, task);
  } catch (err: any) {
    if (err.message === "Task not found") return notFound(res, err.message);
    return serverError(res, err.message);
  }
};

export const listPendingSubmissions = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const submissions = await taskService.listPendingSubmissions();
    return ok(res, submissions);
  } catch (err: any) {
    return serverError(res, err.message);
  }
};

export const listModuleTasks = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const tasks = await taskService.listModuleTasks(param(req.params.moduleId));
    return ok(res, tasks);
  } catch (err: any) {
    return serverError(res, err.message, "INTERNAL_ERROR");
  }
};

export const createTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const task = await taskService.createTask(req.body);
    return created(res, task);
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};

export const updateTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const task = await taskService.updateTask(param(req.params.id), req.body);
    return ok(res, task);
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};

export const deleteTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await taskService.deleteTask(param(req.params.id));
    return ok(res, null, "Task deleted");
  } catch (err: any) {
    return serverError(res, err.message, "INTERNAL_ERROR");
  }
};

export const submitTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const submission = await taskService.submitTask(
      req.user!.userId,
      param(req.params.taskId),
      req.body,
    );
    return created(res, submission, "Task submitted");
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};

export const addAttachment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const attachment = await taskService.addAttachment(param(req.params.taskId), req.body);
    return created(res, attachment);
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};

export const deleteAttachment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await taskService.deleteAttachment(
      param(req.params.attachmentId),
      param(req.params.taskId),
    );
    return ok(res, null, "Attachment deleted");
  } catch (err: any) {
    return serverError(res, err.message, "INTERNAL_ERROR");
  }
};

export const reviewTaskSubmission = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const reviewed = await taskService.reviewSubmission(
      param(req.params.submissionId),
      req.user!.userId,
      req.body,
    );
    return ok(res, reviewed, "Submission reviewed");
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};
