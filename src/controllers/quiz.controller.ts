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
    return notFound(res, err.message, "NOT_FOUND");
  }
};

export const submitQuiz = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await quizService.submitQuiz(req.user!.userId, req.body);
    return ok(res, result, "Quiz submitted");
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
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
    return serverError(res, err.message, "INTERNAL_ERROR");
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
    return notFound(res, err.message, "NOT_FOUND");
  }
};

export const createQuiz = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const quiz = await quizService.createQuiz(req.body);
    return created(res, quiz);
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};

export const updateQuiz = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const quiz = await quizService.updateQuiz(param(req.params.id), req.body);
    return ok(res, quiz);
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};

export const deleteQuiz = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await quizService.deleteQuiz(param(req.params.id));
    return ok(res, null, "Quiz deleted");
  } catch (err: any) {
    return serverError(res, err.message, "INTERNAL_ERROR");
  }
};

export const restoreQuiz = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const quiz = await quizService.restoreQuiz(param(req.params.id));
    return ok(res, quiz, "Quiz restored");
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
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
    return badRequest(res, err.message, "BAD_REQUEST");
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
    return badRequest(res, err.message, "BAD_REQUEST");
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
    return serverError(res, err.message, "INTERNAL_ERROR");
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
    return badRequest(res, err.message, "BAD_REQUEST");
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
    return serverError(res, err.message, "INTERNAL_ERROR");
  }
};

// ─── Grading ─────────────────────────────────────────────────────

export const listPendingGrading = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const data = await quizService.listPendingGrading(page, limit);
    return ok(res, data);
  } catch (err: any) {
    return serverError(res, err.message, "INTERNAL_ERROR");
  }
};

export const getGradingDetail = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const attempt = await quizService.getGradingDetail(
      param(req.params.attemptId),
    );
    return ok(res, attempt);
  } catch (err: any) {
    return notFound(res, err.message, "NOT_FOUND");
  }
};

export const gradeAnswer = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { score, feedback } = req.body;
    if (score === undefined || typeof score !== "number" || score < 0) {
      return badRequest(res, "score is required and must be >= 0");
    }
    const answer = await quizService.gradeAnswer(
      param(req.params.attemptAnswerId),
      { score, feedback },
    );
    return ok(res, answer, "Answer graded");
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};

export const gradeAllAnswers = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { grades } = req.body;
    if (!Array.isArray(grades) || grades.length === 0) {
      return badRequest(res, "grades array is required");
    }
    const attempt = await quizService.gradeAllAnswers(
      param(req.params.attemptId),
      grades,
    );
    return ok(res, attempt, "All answers graded");
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};
