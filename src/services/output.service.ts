import { prisma } from "../lib/prisma";
import { SubmitOutputDto, ReviewOutputDto } from "../types";

export class OutputService {
  async submitOutput(userId: string, dto: SubmitOutputDto) {
    return prisma.studentOutput.create({
      data: { userId, ...dto, status: "PENDING" },
    });
  }

  async getMyOutputs(userId: string) {
    return prisma.studentOutput.findMany({
      where: { userId },
      orderBy: { submittedAt: "desc" },
    });
  }

  async getAllOutputs(page = 1, limit = 20, status?: string) {
    const where = status ? { status: status as any } : {};
    const skip = (page - 1) * limit;
    const [outputs, total] = await Promise.all([
      prisma.studentOutput.findMany({
        where,
        skip,
        take: limit,
        orderBy: { submittedAt: "desc" },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.studentOutput.count({ where }),
    ]);
    return { outputs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async reviewOutput(id: string, reviewedById: string, dto: ReviewOutputDto) {
    const output = await prisma.studentOutput.update({
      where: { id },
      data: { status: dto.status, adminComment: dto.adminComment, reviewedAt: new Date(), reviewedById },
    });

    // Notify student
    await prisma.notification.create({
      data: {
        userId: output.userId,
        type: "OUTPUT_REVIEWED",
        titleEn: "Your output has been reviewed",
        titleFil: "Nasuri na ang iyong output",
        bodyEn: dto.status === "REVIEWED" ? "Your output was approved!" : "Your output was returned with comments.",
        bodyFil: dto.status === "REVIEWED" ? "Naaprubahan ang iyong output!" : "Ibinalik ang iyong output na may mga komento.",
        link: `/outputs/${id}`,
      },
    });

    return output;
  }
}

export const outputService = new OutputService();