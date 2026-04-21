import { Prisma, ModuleItemType, PageKind, LessonStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withNotDeleted } from "@/utils/soft-delete";

type CreatePageInput = {
  moduleId: string;
  titleEn: string;
  titleFil: string;
  kind?: PageKind;
  slug?: string;
  bannerUrl?: string | null;
  bannerFileId?: string | null;
  durationSecs?: number;
  order?: number;
  status?: LessonStatus;
};

type UpdatePageInput = {
  [K in keyof Omit<CreatePageInput, "moduleId">]?: CreatePageInput[K] | null;
} & { requiresPrevious?: boolean };

class PageService {
  async listByModule(moduleId: string) {
    return prisma.page.findMany({
      where: withNotDeleted({ moduleId }),
      orderBy: { order: "asc" },
      include: { moduleItem: true, _count: { select: { blocks: true } } },
    });
  }

  async getWithBlocks(pageId: string) {
    return prisma.page.findFirst({
      where: withNotDeleted({ id: pageId }),
      include: {
        module: { select: { id: true, courseId: true } },
        moduleItem: true,
        blocks: {
          where: { deletedAt: null },
          orderBy: { order: "asc" },
          include: {
            timestamps: { orderBy: { timestampSecs: "asc" } },
            moduleItem: {
              include: {
                quiz: { include: { questions: { include: { options: true } } } },
                task: { include: { rubricCriteria: { orderBy: { order: "asc" } } } },
              },
            },
          },
        },
      },
    });
  }

  async create(data: CreatePageInput) {
    let order = data.order;
    if (order === undefined) {
      const last = await prisma.page.findFirst({
        where: withNotDeleted({ moduleId: data.moduleId }),
        orderBy: { order: "desc" },
        select: { order: true },
      });
      order = (last?.order ?? -1) + 1;
    }

    return prisma.$transaction(async (tx) => {
      const page = await tx.page.create({
        data: {
          moduleId: data.moduleId,
          kind: data.kind ?? PageKind.LESSON,
          titleEn: data.titleEn,
          titleFil: data.titleFil,
          slug: data.slug,
          bannerUrl: data.bannerUrl ?? undefined,
          bannerFileId: data.bannerFileId ?? undefined,
          durationSecs: data.durationSecs,
          status: data.status ?? LessonStatus.DRAFT,
          order: order!,
        },
      });

      // Create a top-level ModuleItem of type PAGE so unlock logic sees it.
      const lastMI = await tx.moduleItem.findFirst({
        where: { moduleId: data.moduleId, deletedAt: null },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      await tx.moduleItem.create({
        data: {
          moduleId: data.moduleId,
          type: ModuleItemType.PAGE,
          pageId: page.id,
          order: (lastMI?.order ?? -1) + 1,
        },
      });

      return page;
    });
  }

  async update(pageId: string, data: UpdatePageInput) {
    const page = await prisma.page.findFirst({
      where: withNotDeleted({ id: pageId }),
      select: { id: true },
    });
    if (!page) throw new Error("Page not found");

    return prisma.page.update({
      where: { id: pageId },
      data: {
        titleEn: data.titleEn ?? undefined,
        titleFil: data.titleFil ?? undefined,
        slug: data.slug ?? undefined,
        durationSecs: data.durationSecs ?? undefined,
        order: data.order ?? undefined,
        status: data.status ?? undefined,
        requiresPrevious: data.requiresPrevious,
        bannerUrl: data.bannerUrl ?? undefined,
        bannerFileId: data.bannerFileId ?? undefined,
        kind: data.kind ?? undefined,
      },
    });
  }

  async softDelete(pageId: string) {
    return prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.page.update({ where: { id: pageId }, data: { deletedAt: now } });
      // Also soft-delete the matching ModuleItem
      await tx.moduleItem.updateMany({
        where: { pageId, deletedAt: null },
        data: { deletedAt: now },
      });
    });
  }

  async reorder(moduleId: string, updates: { id: string; order: number }[]) {
    return prisma.$transaction(
      updates.map((u) =>
        prisma.page.update({
          where: { id: u.id },
          data: { order: u.order },
        }),
      ),
    );
  }

  async getProgress(userId: string, pageId: string) {
    return prisma.pageProgress.findUnique({
      where: { userId_pageId: { userId, pageId } },
    });
  }

  async markComplete(userId: string, pageId: string) {
    const page = await prisma.page.findUnique({
      where: { id: pageId },
      select: { id: true, moduleId: true, deletedAt: true },
    });
    if (!page || page.deletedAt) {
      const err: any = new Error("Page not found");
      err.status = 404;
      throw err;
    }

    return prisma.pageProgress.upsert({
      where: { userId_pageId: { userId, pageId } },
      update: {
        isCompleted: true,
        scrolledToEnd: true,
        scrolledPercent: 100,
        completedAt: new Date(),
      },
      create: {
        userId,
        pageId,
        isCompleted: true,
        scrolledToEnd: true,
        scrolledPercent: 100,
        completedAt: new Date(),
      },
    });
  }
}

export const pageService = new PageService();
