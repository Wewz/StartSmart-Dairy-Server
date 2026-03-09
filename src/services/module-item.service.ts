import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

class ModuleItemService {
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

  async listModuleItems(moduleId: string, role: string) {
    const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

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

    await prisma.$transaction(
      uniqueOrderedIds.map((id, index) =>
        prisma.moduleItem.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );

    return this.listModuleItems(moduleId, "ADMIN");
  }
}

export const moduleItemService = new ModuleItemService();
