import { Router } from "express";
import * as quiz from "../controllers/quiz.controller";
import * as progress from "../controllers/progress.controller";
import * as discussion from "../controllers/discussion.controller";
import * as output from "../controllers/output.controller";
import * as notification from "../controllers/notification.controller";
import { authenticate, requireAdmin, requireInstructor } from "../middleware/auth.middleware";

// Quiz routes
export const quizRouter = Router();
quizRouter.get("/:id", authenticate, quiz.getQuiz);
quizRouter.post("/submit", authenticate, quiz.submitQuiz);
quizRouter.get("/:quizId/attempts", authenticate, quiz.getAttemptHistory);
quizRouter.post("/", authenticate, requireInstructor, quiz.createQuiz);
quizRouter.post("/:quizId/questions", authenticate, requireInstructor, quiz.addQuestion);

// Progress routes
export const progressRouter = Router();
progressRouter.post("/lesson", authenticate, progress.updateProgress);
progressRouter.get("/course/:courseId", authenticate, progress.getEnrollmentProgress);

// Discussion routes
export const discussionRouter = Router();
discussionRouter.get("/module/:moduleId", authenticate, discussion.getThreads);
discussionRouter.get("/:id", authenticate, discussion.getThread);
discussionRouter.post("/", authenticate, discussion.createThread);
discussionRouter.post("/:threadId/replies", authenticate, discussion.createReply);
discussionRouter.delete("/:id", authenticate, discussion.deleteThread);
discussionRouter.delete("/replies/:id", authenticate, discussion.deleteReply);
discussionRouter.patch("/:id/pin", authenticate, requireInstructor, discussion.pinThread);

// Output routes
export const outputRouter = Router();
outputRouter.get("/", authenticate, output.getMyOutputs);
outputRouter.post("/", authenticate, output.submitOutput);
outputRouter.get("/admin/all", authenticate, requireAdmin, output.getAllOutputs);
outputRouter.patch("/:id/review", authenticate, requireAdmin, output.reviewOutput);

// Notification routes
export const notificationRouter = Router();
notificationRouter.get("/", authenticate, notification.getNotifications);
notificationRouter.patch("/:id/read", authenticate, notification.markAsRead);
notificationRouter.patch("/read-all", authenticate, notification.markAllAsRead);