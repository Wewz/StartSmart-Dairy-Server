import { prisma } from "@/lib/prisma";
import {
  CreateCriterionDto,
  UpdateCriterionDto,
  GradeSubmissionDto,
} from "@/validation/task-rubric.validation";

export class TaskRubricService {
  async getCriteria(taskId: string) {
    return prisma.taskRubricCriterion.findMany({
      where: { taskId },
      orderBy: { order: "asc" },
    });
  }

  async addCriterion(taskId: string, dto: CreateCriterionDto) {
    const task = await prisma.moduleTask.findUnique({ where: { id: taskId } });
    if (!task) throw new Error("Task not found");

    // Default order: append at end
    if (dto.order === undefined) {
      const count = await prisma.taskRubricCriterion.count({ where: { taskId } });
      dto = { ...dto, order: count };
    }

    const criterion = await prisma.taskRubricCriterion.create({
      data: { taskId, ...dto },
    });

    // Update task maxScore = sum of criterion maxPoints
    await this.syncTaskMaxScore(taskId);
    return criterion;
  }

  async updateCriterion(criterionId: string, dto: UpdateCriterionDto) {
    const existing = await prisma.taskRubricCriterion.findUnique({
      where: { id: criterionId },
    });
    if (!existing) throw new Error("Criterion not found");

    const criterion = await prisma.taskRubricCriterion.update({
      where: { id: criterionId },
      data: dto,
    });

    await this.syncTaskMaxScore(existing.taskId);
    return criterion;
  }

  async deleteCriterion(criterionId: string) {
    const existing = await prisma.taskRubricCriterion.findUnique({
      where: { id: criterionId },
    });
    if (!existing) throw new Error("Criterion not found");

    await prisma.taskRubricCriterion.delete({ where: { id: criterionId } });
    await this.syncTaskMaxScore(existing.taskId);
  }

  async reorderCriteria(taskId: string, orderedIds: string[]) {
    const updates = orderedIds.map((id, index) =>
      prisma.taskRubricCriterion.update({
        where: { id },
        data: { order: index },
      }),
    );
    return prisma.$transaction(updates);
  }

  async gradeSubmission(submissionId: string, dto: GradeSubmissionDto) {
    const submission = await prisma.taskSubmission.findUnique({
      where: { id: submissionId },
      include: { task: { include: { rubricCriteria: true } } },
    });
    if (!submission) throw new Error("Submission not found");

    // Validate scores don't exceed criterion max
    for (const cs of dto.criterionScores) {
      const criterion = submission.task.rubricCriteria.find(
        (c) => c.id === cs.criterionId,
      );
      if (!criterion) throw new Error(`Criterion ${cs.criterionId} not found`);
      if (cs.score > criterion.maxPoints) {
        throw new Error(
          `Score ${cs.score} exceeds max ${criterion.maxPoints} for "${criterion.titleEn}"`,
        );
      }
    }

    const totalScore = dto.criterionScores.reduce((sum, cs) => sum + cs.score, 0);

    await prisma.$transaction([
      // Upsert each criterion score
      ...dto.criterionScores.map((cs) =>
        prisma.taskCriterionScore.upsert({
          where: {
            submissionId_criterionId: {
              submissionId,
              criterionId: cs.criterionId,
            },
          },
          create: { submissionId, criterionId: cs.criterionId, score: cs.score },
          update: { score: cs.score },
        }),
      ),
      // Update submission totals
      prisma.taskSubmission.update({
        where: { id: submissionId },
        data: {
          score: totalScore,
          feedback: dto.feedback,
          status: "REVIEWED",
          reviewedAt: new Date(),
        },
      }),
    ]);

    return prisma.taskSubmission.findUnique({
      where: { id: submissionId },
      include: { criterionScores: { include: { criterion: true } } },
    });
  }

  private async syncTaskMaxScore(taskId: string) {
    const criteria = await prisma.taskRubricCriterion.findMany({
      where: { taskId },
    });
    const total = criteria.reduce((sum, c) => sum + c.maxPoints, 0);
    await prisma.moduleTask.update({
      where: { id: taskId },
      data: { maxScore: total > 0 ? total : null },
    });
  }
}

export const taskRubricService = new TaskRubricService();
