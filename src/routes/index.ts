import { Router } from "express";
import * as quiz from "@/controllers/quiz.controller";
import * as progress from "@/controllers/progress.controller";
import * as discussion from "@/controllers/discussion.controller";
import * as output from "@/controllers/output.controller";
import * as notification from "@/controllers/notification.controller";
import * as admin from "@/controllers/admin.controller";
import * as activity from "@/controllers/activity.controller";
import * as certificate from "@/controllers/certificate.controller";
import * as studentNote from "@/controllers/student-note.controller";
import { validateRequest } from "@/middleware/validate.middleware";
import {
  createQuizSchema,
  submitQuizSchema,
  updateQuizSchema,
} from "@/validation/quiz.validation";
import { authenticate, requireAdmin } from "@/middleware/auth.middleware";

// ─── Quiz routes ──────────────────────────────────────────────────
export const quizRouter = Router();

// Student-facing
quizRouter.get("/:id", authenticate, quiz.getQuiz);
quizRouter.post(
  "/submit",
  authenticate,
  validateRequest({ body: submitQuizSchema }),
  quiz.submitQuiz,
);
quizRouter.get("/:quizId/attempts", authenticate, quiz.getAttemptHistory);

// Admin-facing
quizRouter.get("/:id/admin", authenticate, requireAdmin, quiz.getQuizAdmin);
quizRouter.post(
  "/",
  authenticate,
  requireAdmin,
  validateRequest({ body: createQuizSchema }),
  quiz.createQuiz,
);
quizRouter.patch(
  "/:id",
  authenticate,
  requireAdmin,
  validateRequest({ body: updateQuizSchema }),
  quiz.updateQuiz,
);
quizRouter.patch("/:id/restore", authenticate, requireAdmin, quiz.restoreQuiz);
quizRouter.delete("/:id", authenticate, requireAdmin, quiz.deleteQuiz);

quizRouter.post(
  "/:quizId/questions",
  authenticate,
  requireAdmin,
  quiz.addQuestion,
);
quizRouter.patch(
  "/questions/:questionId",
  authenticate,
  requireAdmin,
  quiz.updateQuestion,
);
quizRouter.delete(
  "/questions/:questionId",
  authenticate,
  requireAdmin,
  quiz.deleteQuestion,
);

quizRouter.patch(
  "/options/:optionId",
  authenticate,
  requireAdmin,
  quiz.updateAnswerOption,
);
quizRouter.delete(
  "/options/:optionId",
  authenticate,
  requireAdmin,
  quiz.deleteAnswerOption,
);

// ─── Progress routes ──────────────────────────────────────────────
export const progressRouter = Router();
progressRouter.post("/lesson", authenticate, progress.updateProgress);
progressRouter.get(
  "/course/:courseId",
  authenticate,
  progress.getEnrollmentProgress,
);

// ─── Discussion routes ────────────────────────────────────────────
export const discussionRouter = Router();
discussionRouter.get("/module/:moduleId", authenticate, discussion.getThreads);
discussionRouter.get("/:id", authenticate, discussion.getThread);
discussionRouter.post("/", authenticate, discussion.createThread);
discussionRouter.post(
  "/:threadId/replies",
  authenticate,
  discussion.createReply,
);
discussionRouter.delete("/:id", authenticate, discussion.deleteThread);
discussionRouter.delete("/replies/:id", authenticate, discussion.deleteReply);
discussionRouter.patch(
  "/:id/pin",
  authenticate,
  requireAdmin,
  discussion.pinThread,
);

// ─── Output routes ────────────────────────────────────────────────
export const outputRouter = Router();
outputRouter.get("/", authenticate, output.getMyOutputs);
outputRouter.post("/", authenticate, output.submitOutput);
outputRouter.get(
  "/admin/all",
  authenticate,
  requireAdmin,
  output.getAllOutputs,
);
outputRouter.patch(
  "/:id/review",
  authenticate,
  requireAdmin,
  output.reviewOutput,
);

// ─── Notification routes ──────────────────────────────────────────
export const notificationRouter = Router();
notificationRouter.get("/", authenticate, notification.getNotifications);
notificationRouter.patch("/:id/read", authenticate, notification.markAsRead);
notificationRouter.patch("/read-all", authenticate, notification.markAllAsRead);

// ─── Grading routes (admin) ──────────────────────────────────────
export const gradingRouter = Router();
gradingRouter.get(
  "/pending",
  authenticate,
  requireAdmin,
  quiz.listPendingGrading,
);
gradingRouter.get(
  "/:attemptId",
  authenticate,
  requireAdmin,
  quiz.getGradingDetail,
);
gradingRouter.patch(
  "/answers/:attemptAnswerId",
  authenticate,
  requireAdmin,
  quiz.gradeAnswer,
);
gradingRouter.patch(
  "/:attemptId/grade-all",
  authenticate,
  requireAdmin,
  quiz.gradeAllAnswers,
);

// ─── Admin routes ─────────────────────────────────────────────────
export const adminRouter = Router();
adminRouter.get("/stats", authenticate, requireAdmin, admin.getDashboardStats);
adminRouter.get("/users", authenticate, requireAdmin, admin.listUsers);
adminRouter.get("/users/:id", authenticate, requireAdmin, admin.getUser);
adminRouter.patch("/users/:id", authenticate, requireAdmin, admin.updateUser);
adminRouter.post("/users", authenticate, requireAdmin, admin.createUser);
adminRouter.get(
  "/enrollments",
  authenticate,
  requireAdmin,
  admin.listEnrollments,
);

// ─── Activity & Stats routes ──────────────────────────────────────
export const activityRouter = Router();
activityRouter.post("/log", authenticate, activity.logActivity);
activityRouter.get("/stats", authenticate, activity.getMyStats);
activityRouter.get("/heatmap", authenticate, activity.getMyHeatmap);

// ─── Certificate routes ───────────────────────────────────────────
export const certificateRouter = Router();
certificateRouter.get("/", authenticate, certificate.getMyCertificates);
certificateRouter.get("/verify/:verificationId", certificate.verifyCertificate);
certificateRouter.get("/:id", authenticate, certificate.getCertificate);
certificateRouter.post("/generate", authenticate, certificate.generateCertificate);

// ─── Student Notes routes ─────────────────────────────────────────
export const studentNoteRouter = Router();
studentNoteRouter.get("/lessons/:lessonId", authenticate, studentNote.getNotes);
studentNoteRouter.post("/lessons/:lessonId", authenticate, studentNote.createNote);
studentNoteRouter.put("/:noteId", authenticate, studentNote.updateNote);
studentNoteRouter.delete("/:noteId", authenticate, studentNote.deleteNote);
