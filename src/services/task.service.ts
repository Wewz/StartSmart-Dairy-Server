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
  youtubeId?: string | null;
};

type UpdateTaskInput = Partial<CreateTaskInput>;

type AddAttachmentInput = {
  nameEn: string;
  nameFil?: string;
  fileUrl: string;
  fileType: string;
  fileId?: string;
  fileSizeBytes?: number;
  mimeType?: string;
};

class TaskService {
  async getTask(taskId: string, userId: string) {
    const task = await prisma.moduleTask.findUnique({
      where: { id: taskId },
      include: {
        rubricCriteria: { orderBy: { order: "asc" } },
        attachments: { orderBy: { order: "asc" } },
        submissions: {
          where: { userId },
          orderBy: { attemptNum: "desc" },
          take: 1,
          include: { criterionScores: { include: { criterion: true } } },
        },
      },
    });
    if (!task) throw new Error("Task not found");
    return task;
  }

  async listPendingSubmissions() {
    return prisma.taskSubmission.findMany({
      where: { status: "SUBMITTED" },
      orderBy: { submittedAt: "asc" },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        task: {
          select: {
            id: true,
            titleEn: true,
            titleFil: true,
            taskType: true,
            moduleId: true,
            rubricCriteria: { orderBy: { order: "asc" } },
          },
        },
        criterionScores: { include: { criterion: true } },
      },
    });
  }

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
          youtubeId: data.youtubeId ?? undefined,
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
        ...(data.youtubeId !== undefined && {
          youtubeId: data.youtubeId ?? null,
        }),
      },
    });
  }

  async addAttachment(taskId: string, data: AddAttachmentInput) {
    const count = await prisma.taskAttachment.count({ where: { taskId } });
    return prisma.taskAttachment.create({
      data: {
        taskId,
        nameEn: sanitizePlainText(data.nameEn.trim()) ?? data.nameEn.trim(),
        nameFil: data.nameFil?.trim() || undefined,
        fileUrl: data.fileUrl,
        fileType: data.fileType as any,
        fileId: data.fileId,
        fileSizeBytes: data.fileSizeBytes,
        mimeType: data.mimeType,
        order: count,
      },
    });
  }

  async deleteAttachment(attachmentId: string, taskId: string) {
    return prisma.taskAttachment.deleteMany({
      where: { id: attachmentId, taskId },
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

    // Find latest submission for this user+task
    const latest = await prisma.taskSubmission.findFirst({
      where: { taskId, userId },
      orderBy: { attemptNum: "desc" },
    });

    // If latest exists and was RETURNED, create a new attempt
    // If latest exists and is not RETURNED, reject if resubmission not allowed
    if (latest) {
      if (latest.status === "RETURNED") {
        // Create new attempt
        return prisma.taskSubmission.create({
          data: {
            taskId,
            userId,
            attemptNum: latest.attemptNum + 1,
            submissionText: sanitizeRichText(payload.submissionText),
            submissionUrl: payload.submissionUrl,
            submissionFileId: payload.submissionFileId,
          },
        });
      }

      if (!task.allowResubmission) {
        throw new Error("Resubmission is not allowed for this task");
      }

      // Overwrite current attempt (not yet reviewed or re-submitting)
      return prisma.taskSubmission.update({
        where: { id: latest.id },
        data: {
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

    // First submission
    return prisma.taskSubmission.create({
      data: {
        taskId,
        userId,
        attemptNum: 1,
        submissionText: sanitizeRichText(payload.submissionText),
        submissionUrl: payload.submissionUrl,
        submissionFileId: payload.submissionFileId,
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
