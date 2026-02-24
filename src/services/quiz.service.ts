import { prisma } from "../lib/prisma";
import { SubmitQuizDto } from "../types";
import { progressService } from "./progress.service";

export class QuizService {
  // ─── Student-facing ──────────────────────────────────────────────

  async getQuiz(quizId: string, userId: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId, isPublished: true },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: {
            // Strip isCorrect from options — students must not see answers
            options: {
              orderBy: { order: "asc" },
              select: { id: true, textEn: true, textFil: true, order: true },
            },
          },
        },
        attempts: { where: { userId }, orderBy: { attemptNum: "desc" }, take: 1 },
      },
    });
    if (!quiz) throw new Error("Quiz not found");

    const attemptCount = await prisma.quizAttempt.count({ where: { userId, quizId } });
    if (attemptCount >= quiz.maxAttempts) throw new Error("Maximum attempts reached");

    return { quiz, attemptCount };
  }

  async submitQuiz(userId: string, dto: SubmitQuizDto) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: dto.quizId },
      include: { questions: { include: { options: true } }, module: true },
    });
    if (!quiz) throw new Error("Quiz not found");

    const attemptCount = await prisma.quizAttempt.count({
      where: { userId, quizId: dto.quizId },
    });
    if (attemptCount >= quiz.maxAttempts) throw new Error("Maximum attempts reached");

    // Grade answers
    let score = 0;
    let maxScore = 0;
    const gradedAnswers: Array<{
      questionId: string;
      selectedOption: string | null;
      isCorrect: boolean;
    }> = [];

    for (const question of quiz.questions) {
      maxScore += question.points;
      const submitted = dto.answers.find((a) => a.questionId === question.id);
      if (!submitted) {
        gradedAnswers.push({ questionId: question.id, selectedOption: null, isCorrect: false });
        continue;
      }
      const option = question.options.find((o) => o.id === submitted.selectedOptionId);
      const isCorrect = option?.isCorrect ?? false;
      if (isCorrect) score += question.points;
      gradedAnswers.push({
        questionId: question.id,
        selectedOption: submitted.selectedOptionId,
        isCorrect,
      });
    }

    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const isPassed = percentage >= quiz.passingScore;

    const attempt = await prisma.quizAttempt.create({
      data: {
        userId,
        quizId: dto.quizId,
        attemptNum: attemptCount + 1,
        score,
        maxScore,
        percentage,
        isPassed,
        submittedAt: new Date(),
        answers: {
          create: gradedAnswers.map((a) => ({
            questionId: a.questionId,
            selectedOption: a.selectedOption,
            isCorrect: a.isCorrect,
          })),
        },
      },
      include: { answers: true },
    });

    // Update module lock status based on quiz type
    if (quiz.type === "PRE_TEST") {
      await prisma.moduleLockStatus.upsert({
        where: { userId_moduleId: { userId, moduleId: quiz.moduleId } },
        update: {
          pretestPassed: isPassed,
          isUnlocked: isPassed,
          lockReason: isPassed
            ? quiz.module.requiresAllLessons
              ? "LESSONS_INCOMPLETE"
              : "UNLOCKED"
            : "AWAITING_PRETEST",
        },
        create: {
          userId,
          moduleId: quiz.moduleId,
          pretestPassed: isPassed,
          isUnlocked: isPassed,
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
      // Trigger unlock of next module
      await progressService.unlockNextModule(userId, quiz.moduleId);
    }

    return { attempt, score, maxScore, percentage, isPassed };
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
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
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

  async createQuiz(data: {
    moduleId: string;
    titleEn: string;
    titleFil: string;
    type: string;
    passingScore?: number;
    maxAttempts?: number;
    timeLimitMin?: number;
    blocksProgress?: boolean;
  }) {
    return prisma.quiz.create({ data: data as any });
  }

  async updateQuiz(
    id: string,
    data: Partial<{
      titleEn: string;
      titleFil: string;
      passingScore: number;
      maxAttempts: number;
      timeLimitMin: number | null;
      blocksProgress: boolean;
      isPublished: boolean;
    }>,
  ) {
    return prisma.quiz.update({ where: { id }, data });
  }

  async deleteQuiz(id: string) {
    return prisma.quiz.delete({ where: { id } });
  }

  async addQuestion(
    quizId: string,
    data: {
      textEn: string;
      textFil: string;
      order?: number;
      points?: number;
      options: Array<{
        textEn: string;
        textFil: string;
        isCorrect: boolean;
        order?: number;
      }>;
    },
  ) {
    return prisma.question.create({
      data: {
        quizId,
        textEn: data.textEn,
        textFil: data.textFil,
        order: data.order ?? 0,
        points: data.points ?? 1,
        options: { create: data.options },
      },
      include: { options: true },
    });
  }

  async updateQuestion(
    id: string,
    data: Partial<{
      textEn: string;
      textFil: string;
      order: number;
      points: number;
    }>,
  ) {
    return prisma.question.update({ where: { id }, data });
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
    return prisma.answerOption.update({ where: { id }, data });
  }

  async deleteAnswerOption(id: string) {
    return prisma.answerOption.delete({ where: { id } });
  }
}

export const quizService = new QuizService();
