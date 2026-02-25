import { prisma } from "@/lib/prisma";
import { sendEnrollmentEmail } from "@/lib/mailer";
import { slugify, generateInviteCode } from "@/utils/helpers";
import {
  CreateCourseDto,
  CreateModuleDto,
  CreateLessonDto,
  UpdateCourseDto,
  AdminEnrollDto,
} from "@/types";
import { CourseStatus, LessonStatus, Prisma } from "@prisma/client";

export class CourseService {
  async listCourses(userId: string, role: string) {
    if (role === "ADMIN" || role === "SUPER_ADMIN") {
      return prisma.course.findMany({
        orderBy: { order: "asc" },
        include: { _count: { select: { modules: true, enrollments: true } } },
      });
    }

    // Students see enrolled or published non-invite-only
    return prisma.course.findMany({
      where: {
        OR: [
          { status: "PUBLISHED", isInviteOnly: false },
          { enrollments: { some: { userId, status: "ACTIVE" } } },
        ],
      },
      orderBy: { order: "asc" },
      include: {
        _count: { select: { modules: true } },
        enrollments: {
          where: { userId },
          select: { status: true, enrolledAt: true },
        },
      },
    });
  }

  async getCourse(slug: string, userId: string, role: string) {
    const course = await prisma.course.findUnique({
      where: { slug },
      include: {
        modules: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                titleEn: true,
                titleFil: true,
                order: true,
                status: true,
                durationSecs: true,
              },
            },
            quizzes: {
              select: {
                id: true,
                titleEn: true,
                titleFil: true,
                type: true,
                isPublished: true,
              },
            },
            lockStatus: { where: { userId } },
            moduleProgress: { where: { userId } },
          },
        },
        enrollments: { where: { userId } },
        _count: { select: { enrollments: true } },
      },
    });

    if (!course) throw new Error("Course not found");
    return course;
  }

  async createCourse(dto: CreateCourseDto, createdById: string) {
    const slug = slugify(dto.titleEn);
    const existing = await prisma.course.findUnique({ where: { slug } });
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

    return prisma.course.create({
      data: { ...dto, slug: finalSlug, createdById },
    });
  }

  async updateCourse(id: string, data: UpdateCourseDto) {
    return prisma.course.update({ where: { id }, data });
  }

  async deleteCourse(id: string) {
    return prisma.course.delete({ where: { id } });
  }

  // Modules
  async listModules(courseId: string, userId: string, role: string) {
    const modules = await prisma.module.findMany({
      where: { courseId },
      orderBy: { order: "asc" },
      include: {
        lessons: {
          where: role === "ADMIN" || role === "SUPER_ADMIN" ? {} : { status: "PUBLISHED" },
          orderBy: { order: "asc" },
          select: {
            id: true,
            titleEn: true,
            titleFil: true,
            order: true,
            status: true,
            durationSecs: true,
            requiresPrevious: true,
          },
        },
        quizzes: {
          select: {
            id: true,
            titleEn: true,
            titleFil: true,
            type: true,
            isPublished: true,
          },
        },
        lockStatus: { where: { userId } },
        moduleProgress: { where: { userId } },
        _count: { select: { lessons: true } },
      },
    });
    return modules;
  }

  async getModule(id: string, userId: string, role: string) {
    const module = await prisma.module.findUnique({
      where: { id },
      include: {
        lessons: {
          where: role === "ADMIN" || role === "SUPER_ADMIN" ? {} : { status: "PUBLISHED" },
          orderBy: { order: "asc" },
          select: {
            id: true,
            titleEn: true,
            titleFil: true,
            order: true,
            status: true,
            durationSecs: true,
            requiresPrevious: true,
          },
        },
        quizzes: {
          select: {
            id: true,
            titleEn: true,
            titleFil: true,
            type: true,
            isPublished: true,
            passingScore: true,
            maxAttempts: true,
            timeLimitMin: true,
          },
        },
        lockStatus: { where: { userId } },
        moduleProgress: { where: { userId } },
        course: { select: { id: true, slug: true, titleEn: true, titleFil: true } },
      },
    });
    if (!module) throw new Error("Module not found");
    return module;
  }

  async createModule(dto: CreateModuleDto) {
    return prisma.module.create({ data: dto });
  }

  async updateModule(id: string, data: Partial<CreateModuleDto>) {
    return prisma.module.update({ where: { id }, data });
  }

  async deleteModule(id: string) {
    return prisma.module.delete({ where: { id } });
  }

  // Lessons
  async createLesson(dto: CreateLessonDto) {
    return prisma.lesson.create({ data: dto });
  }

  async getLesson(id: string, userId: string) {
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        materials: { orderBy: { order: "asc" } },
        lessonProgress: { where: { userId } },
        module: {
          select: {
            id: true,
            titleEn: true,
            titleFil: true,
            courseId: true,
            course: { select: { slug: true } },
          },
        },
      },
    });
    if (!lesson) throw new Error("Lesson not found");
    return lesson;
  }

  async updateLesson(id: string, data: Prisma.LessonUpdateInput) {
    return prisma.lesson.update({ where: { id }, data });
  }

  async deleteLesson(id: string) {
    return prisma.lesson.delete({ where: { id } });
  }

  // Invite Codes
  async createInviteCode(
    courseId: string,
    createdById: string,
    opts: {
      usageLimit?: number;
      expiresAt?: Date;
      note?: string;
    },
  ) {
    let code = generateInviteCode();
    // Ensure uniqueness
    while (await prisma.inviteCode.findUnique({ where: { code } })) {
      code = generateInviteCode();
    }
    return prisma.inviteCode.create({
      data: { courseId, code, createdById, ...opts },
    });
  }

  async listInviteCodes(courseId: string) {
    return prisma.inviteCode.findMany({
      where: { courseId },
      include: { _count: { select: { uses: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async enrollWithCode(userId: string, code: string) {
    const invite = await prisma.inviteCode.findUnique({
      where: { code, isActive: true },
    });
    if (!invite) throw new Error("Invalid or inactive invite code");
    if (invite.expiresAt && invite.expiresAt < new Date())
      throw new Error("Invite code expired");
    if (invite.usageLimit && invite.usageCount >= invite.usageLimit)
      throw new Error("Invite code limit reached");

    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: invite.courseId } },
    });
    if (existing) throw new Error("Already enrolled");

    const [enrollment] = await prisma.$transaction([
      prisma.enrollment.create({
        data: {
          userId,
          courseId: invite.courseId,
          enrolledVia: "invite_code",
          inviteCodeId: invite.id,
        },
      }),
      prisma.inviteCode.update({
        where: { id: invite.id },
        data: { usageCount: { increment: 1 } },
      }),
      prisma.inviteCodeUse.create({
        data: { inviteCodeId: invite.id, userId },
      }),
    ]);

    await this.initializeFirstModuleLock(userId, invite.courseId);

    // Create enrollment notification
    await prisma.notification.create({
      data: {
        userId,
        type: "ENROLLMENT_CONFIRMED",
        titleEn: "Enrollment Confirmed",
        titleFil: "Nakumpirma ang Pagpapatala",
        bodyEn: "You have been successfully enrolled in a new course.",
        bodyFil: "Matagumpay kang naitalaga sa isang bagong kurso.",
        link: `/courses/${invite.courseId}`,
      },
    });

    return enrollment;
  }

  async adminEnrollUser(dto: AdminEnrollDto, adminId: string) {
    const { userId, courseId } = dto;

    const [user, course] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.course.findUnique({ where: { id: courseId } }),
    ]);
    if (!user) throw new Error("User not found");
    if (!course) throw new Error("Course not found");

    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (existing) throw new Error("User is already enrolled");

    const enrollment = await prisma.enrollment.create({
      data: { userId, courseId, enrolledVia: "admin" },
    });

    await this.initializeFirstModuleLock(userId, courseId);

    await prisma.notification.create({
      data: {
        userId,
        type: "ENROLLMENT_CONFIRMED",
        titleEn: "Enrollment Confirmed",
        titleFil: "Nakumpirma ang Pagpapatala",
        bodyEn: `You have been enrolled in "${course.titleEn}".`,
        bodyFil: `Naitalaga ka sa "${course.titleFil}".`,
        link: `/courses/${course.slug}`,
      },
    });

    const appUrl = process.env.CLIENT_URL ?? "http://localhost:3000";
    sendEnrollmentEmail(user.email, user.name ?? user.email, course.titleEn, appUrl).catch(console.error);

    return enrollment;
  }

  private async initializeFirstModuleLock(userId: string, courseId: string) {
    const firstModule = await prisma.module.findFirst({
      where: { courseId },
      orderBy: { order: "asc" },
    });
    if (!firstModule) return;

    await prisma.moduleLockStatus.upsert({
      where: { userId_moduleId: { userId, moduleId: firstModule.id } },
      update: {},
      create: {
        userId,
        moduleId: firstModule.id,
        isUnlocked: !firstModule.requiresPreTest,
        lockReason: firstModule.requiresPreTest
          ? "AWAITING_PRETEST"
          : "UNLOCKED",
      },
    });
  }
}

export const courseService = new CourseService();
