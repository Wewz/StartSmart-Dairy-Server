import { prisma } from "../lib/prisma";
import { CreateThreadDto, CreateReplyDto } from "../types";

export class DiscussionService {
  async getThreads(moduleId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [threads, total] = await Promise.all([
      prisma.discussionThread.findMany({
        where: { moduleId },
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, image: true, role: true } },
          _count: { select: { replies: true } },
        },
      }),
      prisma.discussionThread.count({ where: { moduleId } }),
    ]);
    return { threads, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getThread(id: string) {
    const thread = await prisma.discussionThread.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, image: true, role: true } },
        replies: {
          orderBy: { createdAt: "asc" },
          include: { user: { select: { id: true, name: true, image: true, role: true } } },
        },
      },
    });
    if (!thread) throw new Error("Thread not found");
    return thread;
  }

  async createThread(userId: string, dto: CreateThreadDto) {
    return prisma.discussionThread.create({
      data: { ...dto, userId },
      include: { user: { select: { id: true, name: true, image: true, role: true } } },
    });
  }

  async createReply(userId: string, threadId: string, dto: CreateReplyDto) {
    const thread = await prisma.discussionThread.findUnique({ where: { id: threadId } });
    if (!thread) throw new Error("Thread not found");
    if (thread.isLocked) throw new Error("Thread is locked");

    const reply = await prisma.discussionReply.create({
      data: { threadId, userId, body: dto.body },
      include: { user: { select: { id: true, name: true, image: true, role: true } } },
    });

    // Notify thread author
    if (thread.userId !== userId) {
      await prisma.notification.create({
        data: {
          userId: thread.userId,
          type: "REPLY_IN_THREAD",
          titleEn: "New reply in your thread",
          titleFil: "Bagong tugon sa iyong thread",
          bodyEn: `Someone replied to your thread: "${thread.titleEn}"`,
          bodyFil: `May nagtugon sa iyong thread: "${thread.titleEn}"`,
          link: `/threads/${threadId}`,
        },
      });
    }

    return reply;
  }

  async deleteThread(id: string, userId: string, role: string) {
    const thread = await prisma.discussionThread.findUnique({ where: { id } });
    if (!thread) throw new Error("Thread not found");
    if (thread.userId !== userId && !["ADMIN", "SUPER_ADMIN"].includes(role)) {
      throw new Error("Not authorized");
    }
    return prisma.discussionThread.delete({ where: { id } });
  }

  async deleteReply(id: string, userId: string, role: string) {
    const reply = await prisma.discussionReply.findUnique({ where: { id } });
    if (!reply) throw new Error("Reply not found");
    if (reply.userId !== userId && !["ADMIN", "SUPER_ADMIN"].includes(role)) {
      throw new Error("Not authorized");
    }
    return prisma.discussionReply.delete({ where: { id } });
  }

  async pinThread(id: string, isPinned: boolean) {
    return prisma.discussionThread.update({ where: { id }, data: { isPinned } });
  }

  async lockThread(id: string, isLocked: boolean) {
    return prisma.discussionThread.update({ where: { id }, data: { isLocked } });
  }
}

export const discussionService = new DiscussionService();