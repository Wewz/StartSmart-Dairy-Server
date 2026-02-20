import { prisma } from "../lib/prisma";
import { UpdateProgressDto } from "../types";

export class ProgressService {
  async updateLessonProgress(userId: string, dto: UpdateProgressDto) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: dto.lessonId },
      include: { module: true },
    });
    if (!lesson) throw new Error("Lesson not found");

    const isCompleted = dto.watchedPercent >= 90;

    const progress = await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId: dto.lessonId } },
      update: {
        watchedPercent: dto.watchedPercent,
        lastWatchedSecs: dto.lastWatchedSecs,
        isCompleted,
        completedAt: isCompleted ? new Date() : undefined,
      },
      create: {
        userId,
        lessonId: dto.lessonId,
        watchedPercent: dto.watchedPercent,
        lastWatchedSecs: dto.lastWatchedSecs,
        isCompleted,
        completedAt: isCompleted ? new Date() : undefined,
      },
    });

    // Recalculate module progress
    await this.recalculateModuleProgress(userId, lesson.moduleId);

    return progress;
  }

  async recalculateModuleProgress(userId: string, moduleId: string) {
    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { lessons: { where: { status: "PUBLISHED" } } },
    });
    if (!module) return;

    const totalLessons = module.lessons.length;
    const completedProgress = await prisma.lessonProgress.count({
      where: { userId, lessonId: { in: module.lessons.map((l) => l.id) }, isCompleted: true },
    });

    const percentComplete = totalLessons > 0 ? Math.round((completedProgress / totalLessons) * 100) : 0;
    const isCompleted = completedProgress === totalLessons && totalLessons > 0;

    await prisma.moduleProgress.upsert({
      where: { userId_moduleId: { userId, moduleId } },
      update: { lessonsCompleted: completedProgress, totalLessons, percentComplete, isCompleted, completedAt: isCompleted ? new Date() : undefined },
      create: { userId, moduleId, lessonsCompleted: completedProgress, totalLessons, percentComplete, isCompleted },
    });

    // Update module lock status if all lessons done
    if (isCompleted && module.requiresAllLessons) {
      const lockStatus = await prisma.moduleLockStatus.findUnique({
        where: { userId_moduleId: { userId, moduleId } },
      });
      if (lockStatus && lockStatus.lockReason === "LESSONS_INCOMPLETE") {
        await prisma.moduleLockStatus.update({
          where: { userId_moduleId: { userId, moduleId } },
          data: { allLessonsDone: true, lockReason: module.requiresPostTest ? "QUIZ_FAILED" : "UNLOCKED" },
        });
      }
    }
  }

  async getEnrollmentProgress(userId: string, courseId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrollment) throw new Error("Not enrolled");

    const modules = await prisma.module.findMany({
      where: { courseId },
      orderBy: { order: "asc" },
      include: {
        moduleProgress: { where: { userId } },
        lockStatus: { where: { userId } },
        lessons: { where: { status: "PUBLISHED" }, select: { id: true } },
      },
    });

    return { enrollment, modules };
  }

  async unlockNextModule(userId: string, currentModuleId: string) {
    const currentModule = await prisma.module.findUnique({ where: { id: currentModuleId } });
    if (!currentModule) return;

    const nextModule = await prisma.module.findFirst({
      where: { courseId: currentModule.courseId, order: { gt: currentModule.order } },
      orderBy: { order: "asc" },
    });

    if (!nextModule) return; // No next module

    await prisma.moduleLockStatus.upsert({
      where: { userId_moduleId: { userId, moduleId: nextModule.id } },
      update: {
        isUnlocked: !nextModule.requiresPreTest,
        lockReason: nextModule.requiresPreTest ? "AWAITING_PRETEST" : "UNLOCKED",
        unlockedAt: new Date(),
      },
      create: {
        userId,
        moduleId: nextModule.id,
        isUnlocked: !nextModule.requiresPreTest,
        lockReason: nextModule.requiresPreTest ? "AWAITING_PRETEST" : "UNLOCKED",
        unlockedAt: new Date(),
      },
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId,
        type: "MODULE_UNLOCKED",
        titleEn: "Module Unlocked",
        titleFil: "Na-unlock ang Modyul",
        bodyEn: `You've unlocked: ${nextModule.titleEn}`,
        bodyFil: `Na-unlock mo na ang: ${nextModule.titleFil}`,
        link: `/modules/${nextModule.id}`,
      },
    });
  }
}

export const progressService = new ProgressService();