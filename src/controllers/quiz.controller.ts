import { Response } from "express";
import { quizService } from "@/services/quiz.service";
import { AuthenticatedRequest } from "@/types";
import {
  ok,
  created,
  badRequest,
  notFound,
  serverError,
} from "@/utils/reponse";
import { param } from "@/utils/helpers";

// ─── Student-facing ───────────────────────────────────────────────

export const getQuiz = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await quizService.getQuiz(
      param(req.params.id),
      req.user!.userId,
    );
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

export const getAttemptHistory = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const attempts = await quizService.getAttemptHistory(
      req.user!.userId,
      param(req.params.quizId),
    );
    return ok(res, attempts);
  } catch (err: any) {
    return serverError(res, err.message);
  }
};

// ─── Admin-facing ─────────────────────────────────────────────────

export const getQuizAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const quiz = await quizService.getQuizAdmin(param(req.params.id));
    return ok(res, quiz);
  } catch (err: any) {
    return notFound(res, err.message);
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

export const updateQuiz = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const quiz = await quizService.updateQuiz(param(req.params.id), req.body);
    return ok(res, quiz);
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const deleteQuiz = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await quizService.deleteQuiz(param(req.params.id));
    return ok(res, null, "Quiz deleted");
  } catch (err: any) {
    return serverError(res, err.message);
  }
};

export const addQuestion = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const question = await quizService.addQuestion(
      param(req.params.quizId),
      req.body,
    );
    return created(res, question);
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const updateQuestion = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const question = await quizService.updateQuestion(
      param(req.params.questionId),
      req.body,
    );
    return ok(res, question);
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const deleteQuestion = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    await quizService.deleteQuestion(param(req.params.questionId));
    return ok(res, null, "Question deleted");
  } catch (err: any) {
    return serverError(res, err.message);
  }
};

export const updateAnswerOption = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const option = await quizService.updateAnswerOption(
      param(req.params.optionId),
      req.body,
    );
    return ok(res, option);
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const deleteAnswerOption = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    await quizService.deleteAnswerOption(param(req.params.optionId));
    return ok(res, null, "Option deleted");
  } catch (err: any) {
    return serverError(res, err.message);
  }
};
