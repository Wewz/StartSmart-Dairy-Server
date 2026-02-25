import { Router } from "express";
import * as quiz from "@/controllers/quiz.controller";
import * as progress from "@/controllers/progress.controller";
import * as discussion from "@/controllers/discussion.controller";
import * as output from "@/controllers/output.controller";
import * as notification from "@/controllers/notification.controller";
import * as admin from "@/controllers/admin.controller";
import {
  authenticate,
  requireAdmin,
} from "@/middleware/auth.middleware";

// ─── Quiz routes ──────────────────────────────────────────────────
export const quizRouter = Router();

// Student-facing
quizRouter.get("/:id", authenticate, quiz.getQuiz);
quizRouter.post("/submit", authenticate, quiz.submitQuiz);
quizRouter.get("/:quizId/attempts", authenticate, quiz.getAttemptHistory);

// Admin-facing
quizRouter.get("/:id/admin", authenticate, requireAdmin, quiz.getQuizAdmin);
quizRouter.post("/", authenticate, requireAdmin, quiz.createQuiz);
quizRouter.patch("/:id", authenticate, requireAdmin, quiz.updateQuiz);
quizRouter.delete("/:id", authenticate, requireAdmin, quiz.deleteQuiz);

quizRouter.post("/:quizId/questions", authenticate, requireAdmin, quiz.addQuestion);
quizRouter.patch("/questions/:questionId", authenticate, requireAdmin, quiz.updateQuestion);
quizRouter.delete("/questions/:questionId", authenticate, requireAdmin, quiz.deleteQuestion);

quizRouter.patch("/options/:optionId", authenticate, requireAdmin, quiz.updateAnswerOption);
quizRouter.delete("/options/:optionId", authenticate, requireAdmin, quiz.deleteAnswerOption);

// ─── Progress routes ──────────────────────────────────────────────
export const progressRouter = Router();
progressRouter.post("/lesson", authenticate, progress.updateProgress);
progressRouter.get("/course/:courseId", authenticate, progress.getEnrollmentProgress);

// ─── Discussion routes ────────────────────────────────────────────
export const discussionRouter = Router();
discussionRouter.get("/module/:moduleId", authenticate, discussion.getThreads);
discussionRouter.get("/:id", authenticate, discussion.getThread);
discussionRouter.post("/", authenticate, discussion.createThread);
discussionRouter.post("/:threadId/replies", authenticate, discussion.createReply);
discussionRouter.delete("/:id", authenticate, discussion.deleteThread);
discussionRouter.delete("/replies/:id", authenticate, discussion.deleteReply);
discussionRouter.patch("/:id/pin", authenticate, requireAdmin, discussion.pinThread);

// ─── Output routes ────────────────────────────────────────────────
export const outputRouter = Router();
outputRouter.get("/", authenticate, output.getMyOutputs);
outputRouter.post("/", authenticate, output.submitOutput);
outputRouter.get("/admin/all", authenticate, requireAdmin, output.getAllOutputs);
outputRouter.patch("/:id/review", authenticate, requireAdmin, output.reviewOutput);

// ─── Notification routes ──────────────────────────────────────────
export const notificationRouter = Router();
notificationRouter.get("/", authenticate, notification.getNotifications);
notificationRouter.patch("/:id/read", authenticate, notification.markAsRead);
notificationRouter.patch("/read-all", authenticate, notification.markAllAsRead);

// ─── Admin routes ─────────────────────────────────────────────────
export const adminRouter = Router();
adminRouter.get("/stats", authenticate, requireAdmin, admin.getDashboardStats);
adminRouter.get("/users", authenticate, requireAdmin, admin.listUsers);
adminRouter.get("/users/:id", authenticate, requireAdmin, admin.getUser);
adminRouter.patch("/users/:id", authenticate, requireAdmin, admin.updateUser);
adminRouter.post("/users", authenticate, requireAdmin, admin.createUser);
adminRouter.get("/enrollments", authenticate, requireAdmin, admin.listEnrollments);
