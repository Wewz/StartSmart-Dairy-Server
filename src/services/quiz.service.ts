import { prisma } from "../lib/prisma";
import { SubmitQuizDto } from "../types";
import { progressService } from "./progress.service";
import { sanitizePlainText, sanitizeRichText } from "@/utils/sanitize";
import { withNotDeleted } from "@/utils/soft-delete";
import { moduleItemService } from "./module-item.service";

type CreateQuizInput = {
  moduleId: string;
  type: "PRE_TEST" | "POST_TEST" | "FORMATIVE";
  titleEn?: string;
  titleFil?: string;
  passingScore?: number;
  maxAttempts?: number;
  timeLimitMin?: number;
  blocksProgress?: boolean;
  questions?: Array<{
    textEn: string;
    textFil?: string;
    order?: number;
    points?: number;
    options?: Array<{
      textEn: string;
      textFil?: string;
      isCorrect: boolean;
      order?: number;
    }>;
  }>;
};

type UpdateQuizInput = Partial<{
  titleEn: string;
  titleFil: string;
  passingScore: number;
  maxAttempts: number;
  timeLimitMin: number | null;
  blocksProgress: boolean;
  isPublished: boolean;
}>;

export class QuizService {
  // ─── Student-facing ──────────────────────────────────────────────

  async getQuiz(quizId: string, userId: string) {
    const quiz = await prisma.quiz.findFirst({
      where: withNotDeleted({ id: quizId, isPublished: true }),
      include: {
        questions: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            textEn: true,
            textFil: true,
            questionType: true,
            order: true,
            points: true,
            maxScore: true,
            // Strip isCorrect from options — students must not see answers
            options: {
              orderBy: { order: "asc" },
              select: { id: true, textEn: true, textFil: true, order: true },
            },
          },
        },
        attempts: {
          where: { userId },
          orderBy: { attemptNum: "desc" },
          take: 1,
        },
      },
    });
    if (!quiz) throw new Error("Quiz not found");

    const attemptCount = await prisma.quizAttempt.count({
      where: { userId, quizId },
    });
    if (attemptCount >= quiz.maxAttempts)
      throw new Error("Maximum attempts reached");

    return { quiz, attemptCount };
  }

  async submitQuiz(userId: string, dto: SubmitQuizDto) {
    const quiz = await prisma.quiz.findFirst({
      where: withNotDeleted({ id: dto.quizId }),
      include: { questions: { include: { options: true } }, module: true },
    });
    if (!quiz) throw new Error("Quiz not found");

    const attemptCount = await prisma.quizAttempt.count({
      where: { userId, quizId: dto.quizId },
    });
    if (attemptCount >= quiz.maxAttempts)
      throw new Error("Maximum attempts reached");

    // Grade answers — handle all question types
    let autoScore = 0;
    let maxScore = 0;
    let hasManualQuestions = false;

    const gradedAnswers: Array<{
      questionId: string;
      selectedOption: string | null;
      isCorrect: boolean | null;
      textAnswer: string | null;
    }> = [];

    for (const question of quiz.questions) {
      maxScore += question.points;
      const submitted = dto.answers.find((a) => a.questionId === question.id);

      if (
        question.questionType === "MULTIPLE_CHOICE" ||
        question.questionType === "TRUE_FALSE"
      ) {
        // Auto-graded
        if (!submitted?.selectedOptionId) {
          gradedAnswers.push({
            questionId: question.id,
            selectedOption: null,
            isCorrect: false,
            textAnswer: null,
          });
          continue;
        }
        const option = question.options.find(
          (o) => o.id === submitted.selectedOptionId,
        );
        const isCorrect = option?.isCorrect ?? false;
        if (isCorrect) autoScore += question.points;
        gradedAnswers.push({
          questionId: question.id,
          selectedOption: submitted.selectedOptionId,
          isCorrect,
          textAnswer: null,
        });
      } else {
        // SHORT_ANSWER or ESSAY — store text, mark pending manual grading
        hasManualQuestions = true;
        gradedAnswers.push({
          questionId: question.id,
          selectedOption: null,
          isCorrect: null, // pending grading
          textAnswer: submitted?.textAnswer ?? "",
        });
      }
    }

    const percentage = hasManualQuestions
      ? null
      : maxScore > 0
        ? Math.round((autoScore / maxScore) * 100)
        : 0;
    const isPassed = hasManualQuestions
      ? null
      : (percentage ?? 0) >= quiz.passingScore;

    const attempt = await prisma.quizAttempt.create({
      data: {
        userId,
        quizId: dto.quizId,
        attemptNum: attemptCount + 1,
        score: autoScore,
        maxScore,
        percentage,
        isPassed,
        requiresGrading: hasManualQuestions,
        isFullyGraded: !hasManualQuestions,
        submittedAt: new Date(),
        answers: {
          create: gradedAnswers.map((a) => ({
            questionId: a.questionId,
            selectedOption: a.selectedOption,
            isCorrect: a.isCorrect,
            textAnswer: a.textAnswer,
          })),
        },
      },
      include: { answers: true },
    });

    // Update module lock status based on quiz type (only for fully graded)
    if (!hasManualQuestions) {
      if (quiz.type === "PRE_TEST") {
        await prisma.moduleLockStatus.upsert({
          where: { userId_moduleId: { userId, moduleId: quiz.moduleId } },
          update: {
            pretestPassed: isPassed ?? false,
            isUnlocked: isPassed ?? false,
            lockReason: isPassed
              ? quiz.module.requiresAllLessons
                ? "LESSONS_INCOMPLETE"
                : "UNLOCKED"
              : "AWAITING_PRETEST",
          },
          create: {
            userId,
            moduleId: quiz.moduleId,
            pretestPassed: isPassed ?? false,
            isUnlocked: isPassed ?? false,
            lockReason: isPassed ? "LESSONS_INCOMPLETE" : "AWAITING_PRETEST",
          },
        });
      }

      if (quiz.type === "POST_TEST" && isPassed) {
        await prisma.moduleLockStatus.upsert({
          where: { userId_moduleId: { userId, moduleId: quiz.moduleId } },
          update: {
            posttestPassed: true,
            isUnlocked: true,
            lockReason: "UNLOCKED",
            unlockedAt: new Date(),
          },
          create: {
            userId,
            moduleId: quiz.moduleId,
            posttestPassed: true,
            isUnlocked: true,
            lockReason: "UNLOCKED",
            unlockedAt: new Date(),
          },
        });
        await progressService.unlockNextModule(userId, quiz.moduleId);
      }
    }

    return { attempt, score: autoScore, maxScore, percentage, isPassed };
  }

  async getAttemptHistory(userId: string, quizId: string) {
    return prisma.quizAttempt.findMany({
      where: { userId, quizId },
      orderBy: { attemptNum: "asc" },
      include: {
        answers: {
          include: {
            question: { select: { textEn: true, textFil: true } },
            option: { select: { textEn: true, textFil: true } },
          },
        },
      },
    });
  }

  // ─── Admin-facing ─────────────────────────────────────────────────

  /** Returns quiz with correct answers exposed — admin only */
  async getQuizAdmin(quizId: string) {
    const quiz = await prisma.quiz.findFirst({
      where: withNotDeleted({ id: quizId }),
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: { options: { orderBy: { order: "asc" } } },
        },
        module: { select: { id: true, titleEn: true, courseId: true } },
      },
    });
    if (!quiz) throw new Error("Quiz not found");
    return quiz;
  }

  async createQuiz(data: CreateQuizInput) {
    if (!data?.moduleId?.trim()) {
      throw new Error("moduleId is required");
    }

    if (
      !data?.type ||
      !["PRE_TEST", "POST_TEST", "FORMATIVE"].includes(data.type)
    ) {
      throw new Error("type must be PRE_TEST, POST_TEST, or FORMATIVE");
    }

    const titleDefaults: Record<
      CreateQuizInput["type"],
      { en: string; fil: string }
    > = {
      PRE_TEST: { en: "Pre-Test", fil: "Pre-Test" },
      POST_TEST: { en: "Post-Test", fil: "Post-Test" },
      FORMATIVE: { en: "Formative Quiz", fil: "Formative Quiz" },
    };

    const normalizedQuestions = (data.questions ?? []).map((q, idx) => ({
      textEn: sanitizeRichText(q.textEn) ?? q.textEn,
      textFil: sanitizeRichText(q.textFil?.trim() || q.textEn) ?? q.textEn,
      order: q.order ?? idx,
      points: q.points ?? 1,
      options: {
        create: (q.options ?? []).map((o, optionIdx) => ({
          textEn: sanitizePlainText(o.textEn) ?? o.textEn,
          textFil: sanitizePlainText(o.textFil?.trim() || o.textEn) ?? o.textEn,
          isCorrect: o.isCorrect,
          order: o.order ?? optionIdx,
        })),
      },
    }));

    const fallbackTitles = titleDefaults[data.type];

    return prisma.$transaction(async (tx) => {
      const quiz = await tx.quiz.create({
        data: {
          moduleId: data.moduleId,
          type: data.type,
          titleEn:
            sanitizePlainText(data.titleEn?.trim() || fallbackTitles.en) ??
            fallbackTitles.en,
          titleFil:
            sanitizePlainText(data.titleFil?.trim() || fallbackTitles.fil) ??
            fallbackTitles.fil,
          passingScore: data.passingScore,
          maxAttempts: data.maxAttempts,
          timeLimitMin: data.timeLimitMin,
          blocksProgress: data.blocksProgress,
          questions:
            normalizedQuestions.length > 0
              ? { create: normalizedQuestions }
              : undefined,
        },
        include: {
          questions: {
            orderBy: { order: "asc" },
            include: { options: { orderBy: { order: "asc" } } },
          },
        },
      });

      await moduleItemService.createQuizItem(data.moduleId, quiz.id, tx);
      return quiz;
    });
  }

  async updateQuiz(id: string, data: UpdateQuizInput) {
    const normalizedData: UpdateQuizInput = {};

    if (data.titleEn !== undefined) {
      const value = data.titleEn.trim();
      if (!value) throw new Error("titleEn cannot be empty");
      normalizedData.titleEn = sanitizePlainText(value) ?? value;
    }

    if (data.titleFil !== undefined) {
      const value = data.titleFil.trim();
      if (!value) throw new Error("titleFil cannot be empty");
      normalizedData.titleFil = sanitizePlainText(value) ?? value;
    }

    if (data.passingScore !== undefined) {
      if (
        !Number.isInteger(data.passingScore) ||
        data.passingScore < 0 ||
        data.passingScore > 100
      ) {
        throw new Error("passingScore must be an integer between 0 and 100");
      }
      normalizedData.passingScore = data.passingScore;
    }

    if (data.maxAttempts !== undefined) {
      if (!Number.isInteger(data.maxAttempts) || data.maxAttempts < 1) {
        throw new Error(
          "maxAttempts must be an integer greater than or equal to 1",
        );
      }
      normalizedData.maxAttempts = data.maxAttempts;
    }

    if (data.timeLimitMin !== undefined) {
      if (
        data.timeLimitMin !== null &&
        (!Number.isInteger(data.timeLimitMin) || data.timeLimitMin < 1)
      ) {
        throw new Error(
          "timeLimitMin must be null or an integer greater than or equal to 1",
        );
      }
      normalizedData.timeLimitMin = data.timeLimitMin;
    }

    if (data.blocksProgress !== undefined) {
      if (typeof data.blocksProgress !== "boolean") {
        throw new Error("blocksProgress must be a boolean");
      }
      normalizedData.blocksProgress = data.blocksProgress;
    }

    if (data.isPublished !== undefined) {
      if (typeof data.isPublished !== "boolean") {
        throw new Error("isPublished must be a boolean");
      }
      normalizedData.isPublished = data.isPublished;
    }

    if (Object.keys(normalizedData).length === 0) {
      throw new Error("No valid fields provided for update");
    }

    return prisma.quiz.update({ where: { id }, data: normalizedData });
  }

  async deleteQuiz(id: string) {
    return prisma.quiz.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restoreQuiz(id: string) {
    return prisma.quiz.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  async addQuestion(
    quizId: string,
    data: {
      textEn: string;
      textFil: string;
      questionType?: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "ESSAY";
      order?: number;
      points?: number;
      maxScore?: number;
      rubricEn?: string;
      rubricFil?: string;
      options?: Array<{
        textEn: string;
        textFil: string;
        isCorrect: boolean;
        order?: number;
      }>;
    },
  ) {
    const questionType = data.questionType ?? "MULTIPLE_CHOICE";
    const options = data.options ?? [];

    return prisma.question.create({
      data: {
        quizId,
        textEn: sanitizeRichText(data.textEn) ?? data.textEn,
        textFil: sanitizeRichText(data.textFil) ?? data.textFil,
        questionType,
        order: data.order ?? 0,
        points: data.points ?? 1,
        maxScore: data.maxScore,
        rubricEn: data.rubricEn ? sanitizeRichText(data.rubricEn) : undefined,
        rubricFil: data.rubricFil ? sanitizeRichText(data.rubricFil) : undefined,
        ...(options.length > 0 && {
          options: {
            create: options.map((o) => ({
              ...o,
              textEn: sanitizePlainText(o.textEn) ?? o.textEn,
              textFil: sanitizePlainText(o.textFil) ?? o.textFil,
            })),
          },
        }),
      },
      include: { options: true },
    });
  }

  async updateQuestion(
    id: string,
    data: Partial<{
      textEn: string;
      textFil: string;
      questionType: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "ESSAY";
      order: number;
      points: number;
      maxScore: number | null;
      rubricEn: string | null;
      rubricFil: string | null;
    }>,
  ) {
    const normalized: Record<string, unknown> = {};
    if (typeof data.textEn === "string") {
      normalized.textEn = sanitizeRichText(data.textEn) ?? data.textEn;
    }
    if (typeof data.textFil === "string") {
      normalized.textFil = sanitizeRichText(data.textFil) ?? data.textFil;
    }
    if (data.questionType !== undefined) normalized.questionType = data.questionType;
    if (data.order !== undefined) normalized.order = data.order;
    if (data.points !== undefined) normalized.points = data.points;
    if (data.maxScore !== undefined) normalized.maxScore = data.maxScore;
    if (data.rubricEn !== undefined) {
      normalized.rubricEn = data.rubricEn ? sanitizeRichText(data.rubricEn) : null;
    }
    if (data.rubricFil !== undefined) {
      normalized.rubricFil = data.rubricFil ? sanitizeRichText(data.rubricFil) : null;
    }
    return prisma.question.update({ where: { id }, data: normalized });
  }

  async deleteQuestion(id: string) {
    return prisma.question.delete({ where: { id } });
  }

  async updateAnswerOption(
    id: string,
    data: Partial<{
      textEn: string;
      textFil: string;
      isCorrect: boolean;
      order: number;
    }>,
  ) {
    const normalized = { ...data };
    if (typeof data.textEn === "string") {
      normalized.textEn = sanitizePlainText(data.textEn) ?? data.textEn;
    }
    if (typeof data.textFil === "string") {
      normalized.textFil = sanitizePlainText(data.textFil) ?? data.textFil;
    }
    return prisma.answerOption.update({ where: { id }, data: normalized });
  }

  async deleteAnswerOption(id: string) {
    return prisma.answerOption.delete({ where: { id } });
  }

  // ─── Grading ──────────────────────────────────────────────────────

  /** List attempts that need manual grading (admin) */
  async listPendingGrading(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [attempts, total] = await Promise.all([
      prisma.quizAttempt.findMany({
        where: { requiresGrading: true, isFullyGraded: false },
        orderBy: { submittedAt: "asc" },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          quiz: {
            select: {
              id: true,
              titleEn: true,
              titleFil: true,
              type: true,
              moduleId: true,
              module: { select: { id: true, titleEn: true, courseId: true } },
            },
          },
          _count: { select: { answers: true } },
        },
      }),
      prisma.quizAttempt.count({
        where: { requiresGrading: true, isFullyGraded: false },
      }),
    ]);
    return { attempts, total, page, limit };
  }

  /** Get a single attempt with full answer details for grading */
  async getGradingDetail(attemptId: string) {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        quiz: {
          select: {
            id: true,
            titleEn: true,
            titleFil: true,
            type: true,
            passingScore: true,
            moduleId: true,
            module: {
              select: { id: true, titleEn: true, courseId: true },
            },
          },
        },
        answers: {
          include: {
            question: {
              include: {
                options: { orderBy: { order: "asc" } },
              },
            },
            option: true,
          },
          orderBy: { question: { order: "asc" } },
        },
      },
    });
    if (!attempt) throw new Error("Attempt not found");
    return attempt;
  }

  /** Grade a single answer (admin) */
  async gradeAnswer(
    attemptAnswerId: string,
    data: { score: number; feedback?: string },
  ) {
    const answer = await prisma.attemptAnswer.update({
      where: { id: attemptAnswerId },
      data: {
        manualScore: data.score,
        manualFeedback: data.feedback
          ? sanitizeRichText(data.feedback)
          : undefined,
        isCorrect: data.score > 0,
      },
      include: {
        attempt: {
          include: {
            answers: { include: { question: true } },
            quiz: {
              include: {
                questions: true,
                module: { select: { id: true, courseId: true } },
              },
            },
          },
        },
      },
    });

    // Check if all manual questions are now graded
    const allGraded = answer.attempt.answers.every(
      (a) => a.isCorrect !== null || a.manualScore !== null,
    );

    if (allGraded) {
      await this.recalculateAttemptScore(answer.attempt.id);
    }

    return answer;
  }

  /** Bulk-grade all answers in an attempt */
  async gradeAllAnswers(
    attemptId: string,
    grades: Array<{ answerId: string; score: number; feedback?: string }>,
  ) {
    await prisma.$transaction(async (tx) => {
      for (const g of grades) {
        await tx.attemptAnswer.update({
          where: { id: g.answerId },
          data: {
            manualScore: g.score,
            manualFeedback: g.feedback
              ? sanitizeRichText(g.feedback)
              : undefined,
            isCorrect: g.score > 0,
          },
        });
      }
    });

    await this.recalculateAttemptScore(attemptId);
    return this.getGradingDetail(attemptId);
  }

  /** Recalculate total score after grading and update attempt */
  private async recalculateAttemptScore(attemptId: string) {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: { include: { question: true } },
        quiz: {
          include: {
            questions: true,
            module: {
              select: {
                id: true,
                courseId: true,
                requiresAllLessons: true,
              },
            },
          },
        },
      },
    });
    if (!attempt) return;

    let totalScore = 0;
    for (const a of attempt.answers) {
      if (a.manualScore !== null) {
        totalScore += a.manualScore;
      } else if (a.isCorrect) {
        totalScore += a.question.points;
      }
    }

    const maxScore =
      attempt.quiz.questions.reduce((sum, q) => sum + q.points, 0);
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const isPassed = percentage >= attempt.quiz.passingScore;

    await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        score: totalScore,
        percentage,
        isPassed,
        isFullyGraded: true,
        requiresGrading: false,
      },
    });

    // Trigger unlock logic now that grading is complete
    if (attempt.quiz.type === "PRE_TEST") {
      await prisma.moduleLockStatus.upsert({
        where: {
          userId_moduleId: {
            userId: attempt.userId,
            moduleId: attempt.quiz.moduleId,
          },
        },
        update: {
          pretestPassed: isPassed,
          isUnlocked: isPassed,
          lockReason: isPassed
            ? attempt.quiz.module.requiresAllLessons
              ? "LESSONS_INCOMPLETE"
              : "UNLOCKED"
            : "AWAITING_PRETEST",
        },
        create: {
          userId: attempt.userId,
          moduleId: attempt.quiz.moduleId,
          pretestPassed: isPassed,
          isUnlocked: isPassed,
          lockReason: isPassed ? "LESSONS_INCOMPLETE" : "AWAITING_PRETEST",
        },
      });
    }

    if (attempt.quiz.type === "POST_TEST" && isPassed) {
      await prisma.moduleLockStatus.upsert({
        where: {
          userId_moduleId: {
            userId: attempt.userId,
            moduleId: attempt.quiz.moduleId,
          },
        },
        update: {
          posttestPassed: true,
          isUnlocked: true,
          lockReason: "UNLOCKED",
          unlockedAt: new Date(),
        },
        create: {
          userId: attempt.userId,
          moduleId: attempt.quiz.moduleId,
          posttestPassed: true,
          isUnlocked: true,
          lockReason: "UNLOCKED",
          unlockedAt: new Date(),
        },
      });
      await progressService.unlockNextModule(
        attempt.userId,
        attempt.quiz.moduleId,
      );
    }

    // Create grading-complete notification for student
    const quiz = attempt.quiz;
    await prisma.notification.create({
      data: {
        userId: attempt.userId,
        type: "QUIZ_REMINDER",
        titleEn: `Quiz Graded: ${quiz.titleEn}`,
        titleFil: quiz.titleFil
          ? `Quiz Na-grade: ${quiz.titleFil}`
          : `Quiz Na-grade: ${quiz.titleEn}`,
        bodyEn: `You scored ${percentage}% (${isPassed ? "Passed" : "Did not pass"}). Tap to view details.`,
        bodyFil: `Nakuha mo ang ${percentage}% (${isPassed ? "Pumasa" : "Hindi pumasa"}). I-tap para makita ang detalye.`,
        isRead: false,
      },
    });
  }
}

export const quizService = new QuizService();
