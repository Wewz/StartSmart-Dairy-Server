import { prisma } from "@/lib/prisma";
import { sanitizePlainText, sanitizeRichText } from "@/utils/sanitize";
import { moduleItemService } from "./module-item.service";

type CreateTaskInput = {
  moduleId: string;
  titleEn: string;
  titleFil?: string;
  descriptionEn?: string;
  descriptionFil?: string;
  taskType: "OUTPUT_SUBMISSION" | "REFLECTION" | "ACTIVITY";
  maxScore?: number;
  dueAt?: string | Date;
  isRequired?: boolean;
  requiresReview?: boolean;
  allowResubmission?: boolean;
};

type UpdateTaskInput = Partial<CreateTaskInput>;

class TaskService {
  async listModuleTasks(moduleId: string) {
    return prisma.moduleTask.findMany({
      where: { moduleId },
      orderBy: { createdAt: "asc" },
      include: {
        submissions: {
          select: {
            id: true,
            userId: true,
            status: true,
            score: true,
            submittedAt: true,
          },
        },
      },
    });
  }

  async createTask(data: CreateTaskInput) {
    if (!data.moduleId?.trim()) throw new Error("moduleId is required");
    if (!data.titleEn?.trim()) throw new Error("titleEn is required");

    return prisma.$transaction(async (tx) => {
      const task = await tx.moduleTask.create({
        data: {
          moduleId: data.moduleId,
          titleEn:
            sanitizePlainText(data.titleEn.trim()) ?? data.titleEn.trim(),
          titleFil:
            sanitizePlainText(data.titleFil?.trim() || "") ??
            data.titleFil?.trim(),
          descriptionEn: sanitizeRichText(data.descriptionEn),
          descriptionFil: sanitizeRichText(data.descriptionFil),
          taskType: data.taskType,
          maxScore: data.maxScore,
          dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
          isRequired: data.isRequired,
          requiresReview: data.requiresReview,
          allowResubmission: data.allowResubmission,
        },
      });

      await moduleItemService.createTaskItem(data.moduleId, task.id, tx);
      return task;
    });
  }

  async updateTask(taskId: string, data: UpdateTaskInput) {
    return prisma.moduleTask.update({
      where: { id: taskId },
      data: {
        ...(data.titleEn !== undefined && {
          titleEn:
            sanitizePlainText(data.titleEn.trim()) ?? data.titleEn.trim(),
        }),
        ...(data.titleFil !== undefined && {
          titleFil:
            sanitizePlainText(data.titleFil?.trim() || "") ??
            data.titleFil?.trim(),
        }),
        ...(data.descriptionEn !== undefined && {
          descriptionEn: sanitizeRichText(data.descriptionEn),
        }),
        ...(data.descriptionFil !== undefined && {
          descriptionFil: sanitizeRichText(data.descriptionFil),
        }),
        ...(data.taskType !== undefined && { taskType: data.taskType }),
        ...(data.maxScore !== undefined && { maxScore: data.maxScore }),
        ...(data.dueAt !== undefined && {
          dueAt: data.dueAt ? new Date(data.dueAt) : null,
        }),
        ...(data.isRequired !== undefined && { isRequired: data.isRequired }),
        ...(data.requiresReview !== undefined && {
          requiresReview: data.requiresReview,
        }),
        ...(data.allowResubmission !== undefined && {
          allowResubmission: data.allowResubmission,
        }),
      },
    });
  }

  async deleteTask(taskId: string) {
    return prisma.$transaction(async (tx) => {
      await tx.moduleItem.deleteMany({ where: { taskId } });
      await tx.taskSubmission.deleteMany({ where: { taskId } });
      return tx.moduleTask.delete({ where: { id: taskId } });
    });
  }

  async submitTask(
    userId: string,
    taskId: string,
    payload: {
      submissionText?: string;
      submissionUrl?: string;
      submissionFileId?: string;
    },
  ) {
    const task = await prisma.moduleTask.findUnique({ where: { id: taskId } });
    if (!task) throw new Error("Task not found");

    const existing = await prisma.taskSubmission.findUnique({
      where: { taskId_userId: { taskId, userId } },
    });
    if (existing && !task.allowResubmission) {
      throw new Error("Resubmission is not allowed for this task");
    }

    return prisma.taskSubmission.upsert({
      where: { taskId_userId: { taskId, userId } },
      create: {
        taskId,
        userId,
        submissionText: sanitizeRichText(payload.submissionText),
        submissionUrl: payload.submissionUrl,
        submissionFileId: payload.submissionFileId,
      },
      update: {
        submissionText: sanitizeRichText(payload.submissionText),
        submissionUrl: payload.submissionUrl,
        submissionFileId: payload.submissionFileId,
        status: "SUBMITTED",
        score: null,
        feedback: null,
        reviewedAt: null,
        reviewedById: null,
        submittedAt: new Date(),
      },
    });
  }

  async reviewSubmission(
    submissionId: string,
    reviewerId: string,
    payload: {
      status: "REVIEWED" | "RETURNED";
      score?: number;
      feedback?: string;
    },
  ) {
    return prisma.taskSubmission.update({
      where: { id: submissionId },
      data: {
        status: payload.status,
        score: payload.score,
        feedback: sanitizeRichText(payload.feedback),
        reviewedAt: new Date(),
        reviewedById: reviewerId,
      },
    });
  }
}

export const taskService = new TaskService();
