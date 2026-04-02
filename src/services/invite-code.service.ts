import { prisma } from "@/lib/prisma";
import { generateInviteCode } from "@/utils/helpers";
import {
  CreateInviteCodeDto,
  UpdateInviteCodeDto,
} from "@/validation/invite-code.validation";

export class InviteCodeService {
  async list(courseId?: string) {
    return prisma.inviteCode.findMany({
      where: courseId
        ? { courses: { some: { courseId } } }
        : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        courses: {
          include: {
            course: {
              select: { id: true, slug: true, titleEn: true, titleFil: true },
            },
          },
        },
        _count: { select: { uses: true } },
      },
    });
  }

  async create(dto: CreateInviteCodeDto, createdById: string) {
    // Verify all courses exist
    const courses = await prisma.course.findMany({
      where: { id: { in: dto.courseIds } },
      select: { id: true },
    });
    if (courses.length !== dto.courseIds.length) {
      throw new Error("One or more courses not found");
    }

    // Generate or validate code
    let code = dto.code;
    if (!code) {
      code = generateInviteCode();
      while (await prisma.inviteCode.findUnique({ where: { code } })) {
        code = generateInviteCode();
      }
    } else {
      const existing = await prisma.inviteCode.findUnique({ where: { code } });
      if (existing) throw new Error("Invite code already exists");
    }

    return prisma.inviteCode.create({
      data: {
        code,
        bundleName: dto.bundleName,
        createdById,
        usageLimit: dto.usageLimit,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        note: dto.note,
        courses: {
          create: dto.courseIds.map((courseId) => ({ courseId })),
        },
      },
      include: {
        courses: {
          include: {
            course: {
              select: { id: true, slug: true, titleEn: true, titleFil: true },
            },
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateInviteCodeDto) {
    const existing = await prisma.inviteCode.findUnique({
      where: { id },
      include: { courses: true },
    });
    if (!existing) throw new Error("Invite code not found");

    return prisma.$transaction(async (tx) => {
      // Replace course links if courseIds provided
      if (dto.courseIds !== undefined) {
        await tx.inviteCodeCourse.deleteMany({ where: { inviteCodeId: id } });
        await tx.inviteCodeCourse.createMany({
          data: dto.courseIds.map((courseId) => ({ inviteCodeId: id, courseId })),
        });
      }

      return tx.inviteCode.update({
        where: { id },
        data: {
          bundleName: dto.bundleName,
          usageLimit: dto.usageLimit,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : dto.expiresAt === null ? null : undefined,
          note: dto.note,
          isActive: dto.isActive,
        },
        include: {
          courses: {
            include: {
              course: {
                select: { id: true, slug: true, titleEn: true, titleFil: true },
              },
            },
          },
          _count: { select: { uses: true } },
        },
      });
    });
  }

  /** Preview or confirm a code redemption.
   * confirm=false → validates and returns course list (no side effects)
   * confirm=true  → creates enrollments and increments usage
   */
  async redeem(userId: string, code: string, confirm: boolean) {
    const invite = await prisma.inviteCode.findUnique({
      where: { code },
      include: {
        courses: {
          include: {
            course: {
              select: { id: true, slug: true, titleEn: true, titleFil: true },
            },
          },
        },
      },
    });

    if (!invite || !invite.isActive) throw new Error("Invalid or inactive invite code");
    if (invite.expiresAt && invite.expiresAt < new Date()) throw new Error("Invite code expired");
    if (invite.usageLimit && invite.usageCount >= invite.usageLimit) {
      throw new Error("Invite code limit reached");
    }

    const courseList = invite.courses.map((ic) => ic.course);

    if (!confirm) {
      // Preview only
      return {
        bundleName: invite.bundleName,
        courses: courseList,
        codeId: invite.id,
      };
    }

    // Confirm — create enrollments for courses the user isn't already in
    const existingEnrollments = await prisma.enrollment.findMany({
      where: {
        userId,
        courseId: { in: courseList.map((c) => c.id) },
      },
      select: { courseId: true },
    });
    const alreadyEnrolledIds = new Set(existingEnrollments.map((e) => e.courseId));
    const toEnroll = courseList.filter((c) => !alreadyEnrolledIds.has(c.id));

    await prisma.$transaction([
      ...toEnroll.map((course) =>
        prisma.enrollment.create({
          data: {
            userId,
            courseId: course.id,
            enrolledVia: "invite_code",
            inviteCodeId: invite.id,
          },
        }),
      ),
      prisma.inviteCode.update({
        where: { id: invite.id },
        data: { usageCount: { increment: 1 } },
      }),
      prisma.inviteCodeUse.upsert({
        where: { inviteCodeId_userId: { inviteCodeId: invite.id, userId } },
        create: { inviteCodeId: invite.id, userId },
        update: {},
      }),
    ]);

    return {
      bundleName: invite.bundleName,
      enrolledCourses: toEnroll,
      skippedCourses: courseList.filter((c) => alreadyEnrolledIds.has(c.id)),
    };
  }
}

export const inviteCodeService = new InviteCodeService();
