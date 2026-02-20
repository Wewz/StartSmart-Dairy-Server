import { Response } from "express";
import { quizService } from "../services/quiz.service";
import { AuthenticatedRequest } from "../types";
import { ok, created, badRequest, notFound, serverError } from "../utils/reponse";

export const getQuiz = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await quizService.getQuiz(req.params.id, req.user!.userId);
    return ok(res, data);
  } catch (err: any) {
    return notFound(res, err.message);
  }
};

export const submitQuiz = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await quizService.submitQuiz(req.user!.userId, req.body);
    return ok(res, result, "Quiz submitted");
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const getAttemptHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const attempts = await quizService.getAttemptHistory(req.user!.userId, req.params.quizId);
    return ok(res, attempts);
  } catch (err: any) {
    return serverError(res, err.message);
  }
};

export const createQuiz = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const quiz = await quizService.createQuiz(req.body);
    return created(res, quiz);
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const addQuestion = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const question = await quizService.addQuestion(req.params.quizId, req.body);
    return created(res, question);
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};