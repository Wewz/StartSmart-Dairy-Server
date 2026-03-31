import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";

dotenv.config();

import authRouter from "./routes/auth.routes";
import courseRouter from "./routes/course.routes";
import moduleRouter from "./routes/module.routes";
import lessonRouter from "./routes/lessons.routes";
import moduleItemsRouter from "./routes/module-items.routes";
import taskRouter from "./routes/task.routes";
import uploadRouter from "./routes/upload.routes";
import translationRouter from "./routes/translation.routes";
import aiRouter from "./routes/ai.routes";
import {
  quizRouter,
  progressRouter,
  discussionRouter,
  outputRouter,
  notificationRouter,
  gradingRouter,
  adminRouter,
} from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

const app = express();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRouter);
app.use("/api/courses", courseRouter);
app.use("/api/modules", moduleRouter);
app.use("/api/lessons", lessonRouter);
app.use("/api/module-items", moduleItemsRouter);
app.use("/api/tasks", taskRouter);
app.use("/api/quizzes", quizRouter);
app.use("/api/uploads", uploadRouter);
app.use("/api/progress", progressRouter);
app.use("/api/discussions", discussionRouter);
app.use("/api/outputs", outputRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/grading", gradingRouter);
app.use("/api/translate", translationRouter);
app.use("/api/ai", aiRouter);
app.use("/api/admin", adminRouter);

// Health check
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() }),
);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;
