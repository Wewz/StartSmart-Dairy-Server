import {
  Prisma,
  BlockType,
  ModuleItemType,
  TaskType,
  QuizType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withNotDeleted } from "@/utils/soft-delete";
import { translate } from "@/services/translation.service";

type TranslatableField = "textFil" | "altFil" | "captionFil";

const SOURCE_MAP: Record<TranslatableField, "textEn" | "altEn" | "captionEn"> = {
  textFil: "textEn",
  altFil: "altEn",
  captionFil: "captionEn",
};

type CreateBlockInput = {
  type: BlockType;
  order?: number;
  headingLevel?: number;
  textEn?: string;
  textFil?: string;
  altEn?: string;
  altFil?: string;
  captionEn?: string;
  captionFil?: string;
  imageUrl?: string;
  imageFileId?: string;
  youtubeId?: string;
  mp4Url?: string;
  fileUrl?: string;
  fileId?: string;
  fileType?: "PDF" | "IMAGE" | "VIDEO" | "AUDIO" | "OTHER";
  fileSizeBytes?: number;
  mimeType?: string;
  originalName?: string;
  calloutStyle?: "INFO" | "TIP" | "WARNING" | "NOTE";
  embedUrl?: string;
  taskInit?: { titleEn: string; titleFil?: string; taskType?: TaskType };
  quizInit?: { titleEn: string; titleFil?: string; quizType?: QuizType };
};

type Nullable<T> = { [K in keyof T]?: T[K] | null };
type UpdateBlockInput = Nullable<Omit<CreateBlockInput, "type" | "taskInit" | "quizInit" | "order">>;

class BlockService {
  async createBlock(pageId: string, input: CreateBlockInput) {
    const page = await prisma.page.findFirst({
      where: withNotDeleted({ id: pageId }),
      select: { id: true, moduleId: true },
    });
    if (!page) throw new Error("Page not found");

    // Determine order
    let order = input.order;
    if (order === undefined) {
      const last = await prisma.contentBlock.findFirst({
        where: { pageId, deletedAt: null },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      order = (last?.order ?? -1) + 1;
    }

    return prisma.$transaction(async (tx) => {
      let moduleItemId: string | undefined;

      // TASK_REF: create ModuleTask + ModuleItem
      if (input.type === BlockType.TASK_REF) {
        if (!input.taskInit) throw new Error("taskInit is required for TASK_REF");
        const task = await tx.moduleTask.create({
          data: {
            moduleId: page.moduleId,
            titleEn: input.taskInit.titleEn,
            titleFil: input.taskInit.titleFil,
            taskType: input.taskInit.taskType ?? TaskType.REFLECTION,
          },
        });
        const lastMI = await tx.moduleItem.findFirst({
          where: { moduleId: page.moduleId, deletedAt: null },
          orderBy: { order: "desc" },
          select: { order: true },
        });
        const mi = await tx.moduleItem.create({
          data: {
            moduleId: page.moduleId,
            type: ModuleItemType.TASK,
            taskId: task.id,
            order: (lastMI?.order ?? -1) + 1,
          },
        });
        moduleItemId = mi.id;
      }

      // QUIZ_REF: create Quiz + ModuleItem
      if (input.type === BlockType.QUIZ_REF) {
        if (!input.quizInit) throw new Error("quizInit is required for QUIZ_REF");
        const quiz = await tx.quiz.create({
          data: {
            moduleId: page.moduleId,
            titleEn: input.quizInit.titleEn,
            titleFil: input.quizInit.titleFil ?? input.quizInit.titleEn,
            type: input.quizInit.quizType ?? QuizType.FORMATIVE,
          },
        });
        const lastMI = await tx.moduleItem.findFirst({
          where: { moduleId: page.moduleId, deletedAt: null },
          orderBy: { order: "desc" },
          select: { order: true },
        });
        const mi = await tx.moduleItem.create({
          data: {
            moduleId: page.moduleId,
            type: ModuleItemType.QUIZ,
            quizId: quiz.id,
            order: (lastMI?.order ?? -1) + 1,
          },
        });
        moduleItemId = mi.id;
      }

      const block = await tx.contentBlock.create({
        data: {
          pageId,
          type: input.type,
          order: order!,
          headingLevel: input.headingLevel,
          textEn: input.textEn,
          textFil: input.textFil,
          altEn: input.altEn,
          altFil: input.altFil,
          captionEn: input.captionEn,
          captionFil: input.captionFil,
          imageUrl: input.imageUrl,
          imageFileId: input.imageFileId,
          youtubeId: input.youtubeId,
          mp4Url: input.mp4Url,
          fileUrl: input.fileUrl,
          fileId: input.fileId,
          fileType: input.fileType,
          fileSizeBytes: input.fileSizeBytes,
          mimeType: input.mimeType,
          originalName: input.originalName,
          calloutStyle: input.calloutStyle,
          embedUrl: input.embedUrl,
          moduleItemId,
        },
        include: { timestamps: true, moduleItem: true },
      });

      return block;
    });
  }

  async updateBlock(blockId: string, data: UpdateBlockInput) {
    const block = await prisma.contentBlock.findFirst({
      where: withNotDeleted({ id: blockId }),
      select: { id: true, type: true },
    });
    if (!block) throw new Error("Block not found");

    // Reject edits to moduleItemId — clients must edit the referenced Task/Quiz directly.
    return prisma.contentBlock.update({
      where: { id: blockId },
      data: {
        headingLevel: data.headingLevel ?? undefined,
        textEn: data.textEn ?? undefined,
        textFil: data.textFil ?? undefined,
        altEn: data.altEn ?? undefined,
        altFil: data.altFil ?? undefined,
        captionEn: data.captionEn ?? undefined,
        captionFil: data.captionFil ?? undefined,
        imageUrl: data.imageUrl ?? undefined,
        imageFileId: data.imageFileId ?? undefined,
        youtubeId: data.youtubeId ?? undefined,
        mp4Url: data.mp4Url ?? undefined,
        fileUrl: data.fileUrl ?? undefined,
        fileId: data.fileId ?? undefined,
        fileType: data.fileType ?? undefined,
        fileSizeBytes: data.fileSizeBytes ?? undefined,
        mimeType: data.mimeType ?? undefined,
        originalName: data.originalName ?? undefined,
        calloutStyle: data.calloutStyle ?? undefined,
        embedUrl: data.embedUrl ?? undefined,
      },
    });
  }

  async deleteBlock(blockId: string, opts: { cascadeModuleItem?: boolean } = {}) {
    const block = await prisma.contentBlock.findFirst({
      where: withNotDeleted({ id: blockId }),
      select: { id: true, type: true, moduleItemId: true },
    });
    if (!block) throw new Error("Block not found");

    const now = new Date();
    return prisma.$transaction(async (tx) => {
      await tx.contentBlock.update({
        where: { id: blockId },
        data: { deletedAt: now, moduleItemId: null },
      });

      if (block.moduleItemId) {
        // Always detach the ModuleItem from the block (unique FK).
        // If cascade requested, also soft-delete the ModuleItem (unlocks next items).
        if (opts.cascadeModuleItem) {
          await tx.moduleItem.update({
            where: { id: block.moduleItemId },
            data: { deletedAt: now },
          });
        }
      }
    });
  }

  async translateBlock(blockId: string, fields?: TranslatableField[]) {
    const block = await prisma.contentBlock.findFirst({
      where: withNotDeleted({ id: blockId }),
    });
    if (!block) throw new Error("Block not found");

    const targetFields: TranslatableField[] =
      fields && fields.length > 0
        ? fields
        : (["textFil", "altFil", "captionFil"] as const).filter((f) => {
            const src = block[SOURCE_MAP[f]];
            return typeof src === "string" && src.trim().length > 0;
          });

    const updates: Partial<Record<TranslatableField, string>> = {};
    const format: "plain" | "html" = block.type === "PARAGRAPH" ? "html" : "plain";

    for (const f of targetFields) {
      const sourceField = SOURCE_MAP[f];
      const source = block[sourceField];
      if (typeof source !== "string" || !source.trim()) continue;
      updates[f] = await translate(source, "en", "fil", format);
    }

    if (Object.keys(updates).length === 0) return block;

    return prisma.contentBlock.update({
      where: { id: blockId },
      data: updates,
    });
  }

  async reorder(pageId: string, updates: { id: string; order: number }[]) {
    return prisma.$transaction(
      updates.map((u) =>
        prisma.contentBlock.update({ where: { id: u.id }, data: { order: u.order } }),
      ),
    );
  }
}

export const blockService = new BlockService();
