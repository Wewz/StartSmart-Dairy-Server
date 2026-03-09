import { Language } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sanitizePlainText, sanitizeRichText } from "@/utils/sanitize";
import { withNotDeleted } from "@/utils/soft-delete";

type CreateSectionInput = {
  headingEn: string;
  headingFil?: string;
  bodyEn?: string;
  bodyFil?: string;
  imageUrl?: string;
  imageFileId?: string;
  imageAltEn?: string;
  imageAltFil?: string;
  order?: number;
};

type UpdateSectionInput = Partial<CreateSectionInput>;

class LessonContentService {
  async listSections(lessonId: string) {
    return prisma.lessonSection.findMany({
      where: { lessonId },
      orderBy: { order: "asc" },
      include: {
        materials: { orderBy: { order: "asc" } },
      },
    });
  }

  async createSection(lessonId: string, data: CreateSectionInput) {
    const lesson = await prisma.lesson.findFirst({
      where: withNotDeleted({ id: lessonId }),
      select: { id: true },
    });
    if (!lesson) throw new Error("Lesson not found");

    let order = data.order;
    if (order === undefined) {
      const last = await prisma.lessonSection.findFirst({
        where: { lessonId },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      order = (last?.order ?? -1) + 1;
    }

    return prisma.lessonSection.create({
      data: {
        lessonId,
        headingEn: sanitizePlainText(data.headingEn) ?? data.headingEn,
        headingFil: sanitizePlainText(data.headingFil),
        bodyEn: sanitizeRichText(data.bodyEn),
        bodyFil: sanitizeRichText(data.bodyFil),
        imageUrl: data.imageUrl,
        imageFileId: data.imageFileId,
        imageAltEn: sanitizePlainText(data.imageAltEn),
        imageAltFil: sanitizePlainText(data.imageAltFil),
        order,
      },
      include: {
        materials: { orderBy: { order: "asc" } },
      },
    });
  }

  async updateSection(sectionId: string, data: UpdateSectionInput) {
    return prisma.lessonSection.update({
      where: { id: sectionId },
      data: {
        ...(data.headingEn !== undefined && {
          headingEn: sanitizePlainText(data.headingEn) ?? data.headingEn,
        }),
        ...(data.headingFil !== undefined && {
          headingFil: sanitizePlainText(data.headingFil),
        }),
        ...(data.bodyEn !== undefined && {
          bodyEn: sanitizeRichText(data.bodyEn),
        }),
        ...(data.bodyFil !== undefined && {
          bodyFil: sanitizeRichText(data.bodyFil),
        }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.imageFileId !== undefined && {
          imageFileId: data.imageFileId,
        }),
        ...(data.imageAltEn !== undefined && {
          imageAltEn: sanitizePlainText(data.imageAltEn),
        }),
        ...(data.imageAltFil !== undefined && {
          imageAltFil: sanitizePlainText(data.imageAltFil),
        }),
        ...(data.order !== undefined && { order: data.order }),
      },
      include: {
        materials: { orderBy: { order: "asc" } },
      },
    });
  }

  async deleteSection(sectionId: string) {
    return prisma.lessonSection.delete({ where: { id: sectionId } });
  }

  async reorderSections(lessonId: string, orderedIds: string[]) {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      throw new Error("orderedIds must contain at least one section id");
    }

    const existing = await prisma.lessonSection.findMany({
      where: { lessonId },
      select: { id: true },
    });
    const existingIds = existing.map((item) => item.id);
    const uniqueOrderedIds = [...new Set(orderedIds)];

    if (uniqueOrderedIds.length !== existingIds.length) {
      throw new Error("orderedIds must include each section exactly once");
    }

    const existingIdSet = new Set(existingIds);
    const hasInvalid = uniqueOrderedIds.some((id) => !existingIdSet.has(id));
    if (hasInvalid) {
      throw new Error(
        "orderedIds contains ids that do not belong to this lesson",
      );
    }

    await prisma.$transaction(
      uniqueOrderedIds.map((id, index) =>
        prisma.lessonSection.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );

    return this.listSections(lessonId);
  }

  async listTranscripts(lessonId: string) {
    return prisma.videoTranscript.findMany({
      where: { lessonId },
      orderBy: { language: "asc" },
    });
  }

  async upsertTranscript(
    lessonId: string,
    language: Language,
    data: { content: string; source?: string; generatedByAi?: boolean },
  ) {
    const lesson = await prisma.lesson.findFirst({
      where: withNotDeleted({ id: lessonId }),
      select: { id: true },
    });
    if (!lesson) throw new Error("Lesson not found");

    const content = sanitizePlainText(data.content) ?? data.content;
    if (!content.trim()) {
      throw new Error("Transcript content is required");
    }

    return prisma.videoTranscript.upsert({
      where: {
        lessonId_language: { lessonId, language },
      },
      create: {
        lessonId,
        language,
        content,
        source: sanitizePlainText(data.source),
        generatedByAi: data.generatedByAi ?? false,
      },
      update: {
        content,
        source: sanitizePlainText(data.source),
        generatedByAi: data.generatedByAi,
      },
    });
  }

  async deleteTranscript(transcriptId: string) {
    return prisma.videoTranscript.delete({ where: { id: transcriptId } });
  }
}

export const lessonContentService = new LessonContentService();
