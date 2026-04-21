import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type AddModuleItemInput =
  | { itemType: "LESSON"; lessonId: string }
  | { itemType: "QUIZ"; quizId: string }
  | { itemType: "TASK"; taskId: string };

type ArchivedModuleItem = {
  itemType: "LESSON" | "QUIZ" | "TASK";
  lessonId?: string;
  quizId?: string;
  taskId?: string;
  titleEn: string;
  titleFil: string | null;
  archivedAt?: Date | null;
};

class ModuleItemService {
  private async removeHiddenModuleItems(moduleId: string) {
    const moduleItems = await prisma.moduleItem.findMany({
      where: { moduleId },
      include: {
        lesson: { select: { id: true, deletedAt: true } },
        quiz: { select: { id: true, deletedAt: true } },
        task: { select: { id: true } },
      },
    });

    const staleIds = moduleItems
      .filter((item) => {
        if (item.type === "LESSON") {
          return !item.lesson || item.lesson.deletedAt !== null;
        }
        if (item.type === "QUIZ") {
          return !item.quiz || item.quiz.deletedAt !== null;
        }
        if (item.type === "TASK") {
          return !item.task;
        }
        return false;
      })
      .map((item) => item.id);

    if (staleIds.length > 0) {
      await prisma.moduleItem.deleteMany({ where: { id: { in: staleIds } } });
    }
  }

  async getNextOrder(
    moduleId: string,
    tx: Prisma.TransactionClient = prisma,
  ): Promise<number> {
    const lastItem = await tx.moduleItem.findFirst({
      where: { moduleId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    return (lastItem?.order ?? -1) + 1;
  }

  async createLessonItem(
    moduleId: string,
    lessonId: string,
    tx: Prisma.TransactionClient = prisma,
  ) {
    const order = await this.getNextOrder(moduleId, tx);
    return tx.moduleItem.create({
      data: {
        moduleId,
        type: "LESSON",
        lessonId,
        order,
      },
    });
  }

  async createQuizItem(
    moduleId: string,
    quizId: string,
    tx: Prisma.TransactionClient = prisma,
  ) {
    const order = await this.getNextOrder(moduleId, tx);
    return tx.moduleItem.create({
      data: {
        moduleId,
        type: "QUIZ",
        quizId,
        order,
      },
    });
  }

  async createTaskItem(
    moduleId: string,
    taskId: string,
    tx: Prisma.TransactionClient = prisma,
  ) {
    const order = await this.getNextOrder(moduleId, tx);
    return tx.moduleItem.create({
      data: {
        moduleId,
        type: "TASK",
        taskId,
        order,
      },
    });
  }

  async listModuleItems(moduleId: string, role: string, userId?: string) {
    const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

    await this.removeHiddenModuleItems(moduleId);

    const items = await prisma.moduleItem.findMany({
      where: { moduleId },
      orderBy: { order: "asc" },
      include: {
        lesson: {
          select: {
            id: true,
            titleEn: true,
            titleFil: true,
            status: true,
            durationSecs: true,
            deletedAt: true,
            lessonProgress: userId
              ? {
                  where: { userId },
                  select: { isCompleted: true, watchedPercent: true },
                }
              : undefined,
          },
        },
        page: {
          select: {
            id: true,
            titleEn: true,
            titleFil: true,
            status: true,
            durationSecs: true,
            deletedAt: true,
            progress: userId
              ? {
                  where: { userId },
                  select: { isCompleted: true, completedAt: true },
                }
              : undefined,
          },
        },
        quiz: {
          select: {
            id: true,
            titleEn: true,
            titleFil: true,
            type: true,
            isPublished: true,
            deletedAt: true,
            blocksProgress: true,
            attempts: userId
              ? {
                  where: { userId },
                  select: { isPassed: true, percentage: true },
                  orderBy: { attemptNum: "desc" },
                }
              : undefined,
          },
        },
        task: {
          select: {
            id: true,
            titleEn: true,
            titleFil: true,
            taskType: true,
            dueAt: true,
            isRequired: true,
            requiresReview: true,
            submissions: userId
              ? {
                  where: { userId },
                  select: { status: true, submittedAt: true },
                  orderBy: { submittedAt: "desc" },
                  take: 1,
                }
              : undefined,
          },
        },
      },
    });

    // Filter out records that are hidden by role-based visibility rules.
    return items.filter((item) => {
      if (item.type === "LESSON") {
        if (!item.lesson || item.lesson.deletedAt) return false;
        if (!isAdmin && item.lesson.status !== "PUBLISHED") return false;
        return true;
      }
      if (item.type === "PAGE") {
        if (!item.page || item.page.deletedAt) return false;
        if (!isAdmin && item.page.status !== "PUBLISHED") return false;
        return true;
      }
      if (item.type === "QUIZ") {
        if (!item.quiz || item.quiz.deletedAt) return false;
        if (!isAdmin && !item.quiz.isPublished) return false;
        return true;
      }
      return Boolean(item.task);
    });
  }

  async reorderModuleItems(moduleId: string, orderedIds: string[]) {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      throw new Error("orderedIds must contain at least one item id");
    }

    await this.removeHiddenModuleItems(moduleId);

    const moduleItems = await prisma.moduleItem.findMany({
      where: { moduleId },
      select: { id: true },
    });

    const existingIds = moduleItems.map((item) => item.id);
    const uniqueOrderedIds = [...new Set(orderedIds)];

    if (uniqueOrderedIds.length !== existingIds.length) {
      throw new Error("orderedIds must include each module item exactly once");
    }

    const existingIdSet = new Set(existingIds);
    const hasInvalidId = uniqueOrderedIds.some((id) => !existingIdSet.has(id));
    if (hasInvalidId) {
      throw new Error(
        "orderedIds contains ids that do not belong to this module",
      );
    }

    await prisma.$transaction(async (tx) => {
      // Use a two-pass strategy to avoid transient unique(moduleId, order) collisions.
      for (const [index, id] of uniqueOrderedIds.entries()) {
        await tx.moduleItem.update({
          where: { id },
          data: { order: index + 10000 },
        });
      }

      for (const [index, id] of uniqueOrderedIds.entries()) {
        await tx.moduleItem.update({
          where: { id },
          data: { order: index },
        });
      }
    });

    return this.listModuleItems(moduleId, "ADMIN");
  }

  async getInlineItemsForLesson(lessonId: string) {
    return prisma.moduleItem.findMany({
      where: { inlineLessonId: lessonId },
      orderBy: { inlineOrder: "asc" },
      include: {
        task: {
          select: {
            id: true,
            titleEn: true,
            titleFil: true,
            taskType: true,
            maxScore: true,
            descriptionEn: true,
            isRequired: true,
          },
        },
        quiz: {
          select: {
            id: true,
            titleEn: true,
            titleFil: true,
            type: true,
            isPublished: true,
            questions: {
              select: { id: true, textEn: true, questionType: true, points: true },
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });
  }

  async setInlineLesson(itemId: string, lessonId: string | null, inlineOrder?: number) {
    const item = await prisma.moduleItem.findUnique({ where: { id: itemId } });
    if (!item) throw new Error("Module item not found");

    if (lessonId !== null) {
      // Default order: after last inline item in this lesson
      if (inlineOrder === undefined) {
        const lastInline = await prisma.moduleItem.findFirst({
          where: { inlineLessonId: lessonId },
          orderBy: { inlineOrder: "desc" },
          select: { inlineOrder: true },
        });
        inlineOrder = (lastInline?.inlineOrder ?? -1) + 1;
      }
    }

    return prisma.moduleItem.update({
      where: { id: itemId },
      data: {
        inlineLessonId: lessonId,
        inlineOrder: lessonId !== null ? inlineOrder : null,
      },
    });
  }

  async reorderInlineItems(lessonId: string, orderedIds: string[]) {
    const updates = orderedIds.map((id, index) =>
      prisma.moduleItem.update({
        where: { id },
        data: { inlineOrder: index },
      }),
    );
    return prisma.$transaction(updates);
  }

  async addModuleItem(moduleId: string, data: AddModuleItemInput) {
    if (data.itemType === "LESSON") {
      const lesson = await prisma.lesson.findFirst({
        where: { id: data.lessonId, moduleId, deletedAt: null },
        select: { id: true },
      });
      if (!lesson) throw new Error("Lesson not found in this module");
      return this.createLessonItem(moduleId, data.lessonId);
    }

    if (data.itemType === "QUIZ") {
      const quiz = await prisma.quiz.findFirst({
        where: { id: data.quizId, moduleId, deletedAt: null },
        select: { id: true },
      });
      if (!quiz) throw new Error("Quiz not found in this module");
      return this.createQuizItem(moduleId, data.quizId);
    }

    const task = await prisma.moduleTask.findFirst({
      where: { id: data.taskId, moduleId },
      select: { id: true },
    });
    if (!task) throw new Error("Task not found in this module");
    return this.createTaskItem(moduleId, data.taskId);
  }

  async listArchivedModuleItems(
    moduleId: string,
  ): Promise<ArchivedModuleItem[]> {
    const linkedItems = await prisma.moduleItem.findMany({
      where: { moduleId },
      select: { lessonId: true, quizId: true, taskId: true },
    });

    const linkedLessonIds = linkedItems
      .map((item) => item.lessonId)
      .filter((id): id is string => Boolean(id));
    const linkedQuizIds = linkedItems
      .map((item) => item.quizId)
      .filter((id): id is string => Boolean(id));
    const linkedTaskIds = linkedItems
      .map((item) => item.taskId)
      .filter((id): id is string => Boolean(id));

    const [lessons, quizzes, tasks] = await Promise.all([
      prisma.lesson.findMany({
        where: {
          moduleId,
          deletedAt: { not: null },
          ...(linkedLessonIds.length > 0
            ? { id: { notIn: linkedLessonIds } }
            : {}),
        },
        select: {
          id: true,
          titleEn: true,
          titleFil: true,
          deletedAt: true,
        },
        orderBy: { deletedAt: "desc" },
      }),
      prisma.quiz.findMany({
        where: {
          moduleId,
          deletedAt: { not: null },
          ...(linkedQuizIds.length > 0 ? { id: { notIn: linkedQuizIds } } : {}),
        },
        select: {
          id: true,
          titleEn: true,
          titleFil: true,
          deletedAt: true,
        },
        orderBy: { deletedAt: "desc" },
      }),
      prisma.moduleTask.findMany({
        where: {
          moduleId,
          ...(linkedTaskIds.length > 0 ? { id: { notIn: linkedTaskIds } } : {}),
          submissions: { some: {} },
        },
        select: {
          id: true,
          titleEn: true,
          titleFil: true,
          submissions: {
            orderBy: { submittedAt: "desc" },
            take: 1,
            select: { submittedAt: true },
          },
        },
      }),
    ]);

    return [
      ...lessons.map((lesson) => ({
        itemType: "LESSON" as const,
        lessonId: lesson.id,
        titleEn: lesson.titleEn,
        titleFil: lesson.titleFil,
        archivedAt: lesson.deletedAt,
      })),
      ...quizzes.map((quiz) => ({
        itemType: "QUIZ" as const,
        quizId: quiz.id,
        titleEn: quiz.titleEn,
        titleFil: quiz.titleFil,
        archivedAt: quiz.deletedAt,
      })),
      ...tasks.map((task) => ({
        itemType: "TASK" as const,
        taskId: task.id,
        titleEn: task.titleEn,
        titleFil: task.titleFil,
        archivedAt: task.submissions[0]?.submittedAt ?? null,
      })),
    ];
  }

  async restoreArchivedModuleItem(moduleId: string, data: AddModuleItemInput) {
    if (data.itemType === "LESSON") {
      const lesson = await prisma.lesson.findFirst({
        where: { id: data.lessonId, moduleId },
        select: { id: true, deletedAt: true },
      });
      if (!lesson) throw new Error("Lesson not found in this module");

      const existingItem = await prisma.moduleItem.findFirst({
        where: { moduleId, lessonId: data.lessonId },
        select: { id: true },
      });
      if (existingItem) throw new Error("Lesson is already in the flow");

      return prisma.$transaction(async (tx) => {
        if (lesson.deletedAt) {
          await tx.lesson.update({
            where: { id: lesson.id },
            data: { deletedAt: null },
          });
        }
        return this.createLessonItem(moduleId, data.lessonId, tx);
      });
    }

    if (data.itemType === "QUIZ") {
      const quiz = await prisma.quiz.findFirst({
        where: { id: data.quizId, moduleId },
        select: { id: true, deletedAt: true },
      });
      if (!quiz) throw new Error("Quiz not found in this module");

      const existingItem = await prisma.moduleItem.findFirst({
        where: { moduleId, quizId: data.quizId },
        select: { id: true },
      });
      if (existingItem) throw new Error("Quiz is already in the flow");

      return prisma.$transaction(async (tx) => {
        if (quiz.deletedAt) {
          await tx.quiz.update({
            where: { id: quiz.id },
            data: { deletedAt: null },
          });
        }
        return this.createQuizItem(moduleId, data.quizId, tx);
      });
    }

    const task = await prisma.moduleTask.findFirst({
      where: { id: data.taskId, moduleId },
      select: { id: true, _count: { select: { submissions: true } } },
    });
    if (!task) throw new Error("Task not found in this module");
    if (task._count.submissions === 0) {
      throw new Error("Task is not archived and cannot be restored");
    }

    const existingItem = await prisma.moduleItem.findFirst({
      where: { moduleId, taskId: data.taskId },
      select: { id: true },
    });
    if (existingItem) throw new Error("Task is already in the flow");

    return this.createTaskItem(moduleId, data.taskId);
  }

  async deleteModuleItem(itemId: string) {
    const item = await prisma.moduleItem.findUnique({
      where: { id: itemId },
      include: {
        lesson: { select: { id: true } },
        quiz: { select: { id: true } },
        task: { select: { id: true } },
      },
    });

    if (!item) throw new Error("Module item not found");

    if (item.type === "LESSON" && item.lessonId) {
      const progressCount = await prisma.lessonProgress.count({
        where: { lessonId: item.lessonId },
      });

      await prisma.$transaction(async (tx) => {
        await tx.moduleItem.delete({ where: { id: itemId } });
        if (progressCount > 0) {
          await tx.lesson.update({
            where: { id: item.lessonId! },
            data: { deletedAt: new Date() },
          });
        } else {
          await tx.lesson.delete({ where: { id: item.lessonId! } });
        }
      });

      return {
        archived: progressCount > 0,
        itemType: "LESSON" as const,
      };
    }

    if (item.type === "QUIZ" && item.quizId) {
      const attemptCount = await prisma.quizAttempt.count({
        where: { quizId: item.quizId },
      });

      await prisma.$transaction(async (tx) => {
        await tx.moduleItem.delete({ where: { id: itemId } });
        if (attemptCount > 0) {
          await tx.quiz.update({
            where: { id: item.quizId! },
            data: { deletedAt: new Date() },
          });
        } else {
          await tx.quiz.delete({ where: { id: item.quizId! } });
        }
      });

      return {
        archived: attemptCount > 0,
        itemType: "QUIZ" as const,
      };
    }

    if (item.type === "TASK" && item.taskId) {
      const submissionCount = await prisma.taskSubmission.count({
        where: { taskId: item.taskId },
      });

      await prisma.$transaction(async (tx) => {
        await tx.moduleItem.delete({ where: { id: itemId } });
        if (submissionCount === 0) {
          await tx.moduleTask.delete({ where: { id: item.taskId! } });
        }
      });

      return {
        archived: submissionCount > 0,
        itemType: "TASK" as const,
      };
    }

    throw new Error("Unsupported module item type");
  }
}

export const moduleItemService = new ModuleItemService();
