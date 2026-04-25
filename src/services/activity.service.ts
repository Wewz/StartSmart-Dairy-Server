import { prisma } from "../lib/prisma";

const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0, title: "Newcomer" },
  { level: 2, xp: 100, title: "Learner" },
  { level: 3, xp: 300, title: "Apprentice" },
  { level: 4, xp: 600, title: "Junior Milker" },
  { level: 5, xp: 1000, title: "Dairy Hand" },
  { level: 6, xp: 1500, title: "Senior Hand" },
  { level: 7, xp: 2500, title: "Specialist" },
  { level: 8, xp: 4000, title: "Expert" },
];

function calcLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i].xp) return LEVEL_THRESHOLDS[i].level;
  }
  return 1;
}

export class ActivityService {
  async logActivity(userId: string, minutesActive = 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.dailyActivity.upsert({
      where: { userId_date: { userId, date: today } },
      update: {
        actions: { increment: 1 },
        minutesActive: { increment: minutesActive },
      },
      create: { userId, date: today, actions: 1, minutesActive },
    });

    await this.updateStreak(userId, today);
  }

  private async updateStreak(userId: string, today: Date) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastActiveDate: true, currentStreak: true, longestStreak: true },
    });
    if (!user) return;

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let newStreak = 1;
    if (user.lastActiveDate) {
      const lastDate = new Date(user.lastActiveDate);
      lastDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / 86400000);
      if (diffDays === 0) return;
      if (diffDays === 1) newStreak = user.currentStreak + 1;
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, user.longestStreak),
        lastActiveDate: today,
      },
    });
  }

  async awardXP(userId: string, amount: number) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        xp: { increment: amount },
        totalMinutes: { increment: 0 },
      },
    });
    const newLevel = calcLevel(user.xp);
    if (newLevel !== user.level) {
      await prisma.user.update({
        where: { id: userId },
        data: { level: newLevel },
      });
    }
    return user;
  }

  async getUserStats(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        lastActiveDate: true,
        xp: true,
        level: true,
        totalMinutes: true,
      },
    });
    if (!user) throw new Error("User not found");

    const levelInfo = LEVEL_THRESHOLDS.find((l) => l.level === user.level);
    const nextLevel = LEVEL_THRESHOLDS.find((l) => l.level === user.level + 1);

    return {
      ...user,
      levelTitle: levelInfo?.title ?? "Newcomer",
      nextLevelXp: nextLevel?.xp ?? null,
      nextLevelTitle: nextLevel?.title ?? null,
    };
  }

  async getHeatmap(userId: string, weeks = 12) {
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);

    return prisma.dailyActivity.findMany({
      where: { userId, date: { gte: since } },
      orderBy: { date: "asc" },
      select: { date: true, actions: true, minutesActive: true },
    });
  }
}

export const activityService = new ActivityService();
