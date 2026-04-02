import { prisma } from "@/lib/prisma";
import { CreateTimestampDto, UpdateTimestampDto } from "@/validation/timestamp.validation";

type BulkTimestampItem = {
  lessonSectionId?: string;
  timestampSecs: number;
  labelEn: string;
  labelFil?: string;
  noteEn?: string;
  noteFil?: string;
  type: "CHAPTER" | "SUBTITLE" | "DISCUSSION" | "KEY_TERM";
  order?: number;
  generatedByAi?: boolean;
};

export class TimestampService {
  async listByLesson(lessonId: string) {
    return prisma.videoTimestamp.findMany({
      where: { lessonId },
      orderBy: [{ lessonSectionId: "asc" }, { timestampSecs: "asc" }],
    });
  }

  async create(dto: CreateTimestampDto) {
    return prisma.videoTimestamp.create({ data: dto });
  }

  async update(id: string, dto: UpdateTimestampDto) {
    const existing = await prisma.videoTimestamp.findUnique({ where: { id } });
    if (!existing) throw new Error("Timestamp not found");
    return prisma.videoTimestamp.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    const existing = await prisma.videoTimestamp.findUnique({ where: { id } });
    if (!existing) throw new Error("Timestamp not found");
    return prisma.videoTimestamp.delete({ where: { id } });
  }

  async reorder(lessonId: string, orderedIds: string[]) {
    const updates = orderedIds.map((id, index) =>
      prisma.videoTimestamp.update({
        where: { id },
        data: { order: index },
      }),
    );
    return prisma.$transaction(updates);
  }

  async bulkSave(
    lessonId: string,
    timestamps: BulkTimestampItem[],
    replacePrevious: boolean,
    lessonSectionId?: string,
  ) {
    return prisma.$transaction(async (tx) => {
      if (replacePrevious) {
        await tx.videoTimestamp.deleteMany({
          where: {
            lessonId,
            generatedByAi: true,
            ...(lessonSectionId !== undefined
              ? { lessonSectionId: lessonSectionId ?? null }
              : {}),
          },
        });
      }

      const created = await Promise.all(
        timestamps.map((ts, index) =>
          tx.videoTimestamp.create({
            data: {
              lessonId,
              lessonSectionId: ts.lessonSectionId,
              timestampSecs: ts.timestampSecs,
              labelEn: ts.labelEn,
              labelFil: ts.labelFil,
              noteEn: ts.noteEn,
              noteFil: ts.noteFil,
              type: ts.type,
              generatedByAi: ts.generatedByAi ?? false,
              order: ts.order ?? index,
            },
          }),
        ),
      );

      return created;
    });
  }
}

export const timestampService = new TimestampService();
