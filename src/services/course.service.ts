import { prisma } from "../lib/prisma";
import { slugify, generateInviteCode } from "../utils/helpers";
import { CreateCourseDto, CreateModuleDto, CreateLessonDto } from "../types";

export class CourseService {
  async listCourses(userId: string, role: string) {
    if (role === "ADMIN" || role === "SUPER_ADMIN") {
      return prisma.course.findMany({
        orderBy: { order: "asc" },
        include: { _count: { select: { modules: true, enrollments: true } } },
      });
    }

    // Students/Instructors see enrolled or published non-invite-only
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
        enrollments: { where: { userId }, select: { status: true, enrolledAt: true } },
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
            lessons: { orderBy: { order: "asc" }, select: { id: true, titleEn: true, titleFil: true, order: true, status: true, durationSecs: true } },
            quizzes: { select: { id: true, titleEn: true, type: true, isPublished: true } },
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

  async updateCourse(id: string, data: Partial<CreateCourseDto> & { status?: string }) {
    return prisma.course.update({ where: { id }, data });
  }

  async deleteCourse(id: string) {
    return prisma.course.delete({ where: { id } });
  }

  // Modules
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
            id: true, titleEn: true, titleFil: true, courseId: true,
            requiresPrevious: false,
          },
        },
      },
    });
    if (!lesson) throw new Error("Lesson not found");
    return lesson;
  }

  async updateLesson(id: string, data: Partial<CreateLessonDto> & { status?: string }) {
    return prisma.lesson.update({ where: { id }, data });
  }

  async deleteLesson(id: string) {
    return prisma.lesson.delete({ where: { id } });
  }

  // Invite Codes
  async createInviteCode(courseId: string, createdById: string, opts: {
    usageLimit?: number;
    expiresAt?: Date;
    note?: string;
  }) {
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
    if (invite.expiresAt && invite.expiresAt < new Date()) throw new Error("Invite code expired");
    if (invite.usageLimit && invite.usageCount >= invite.usageLimit) throw new Error("Invite code limit reached");

    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: invite.courseId } },
    });
    if (existing) throw new Error("Already enrolled");

    const [enrollment] = await prisma.$transaction([
      prisma.enrollment.create({
        data: { userId, courseId: invite.courseId, enrolledVia: "invite_code", inviteCodeId: invite.id },
      }),
      prisma.inviteCode.update({
        where: { id: invite.id },
        data: { usageCount: { increment: 1 } },
      }),
      prisma.inviteCodeUse.create({
        data: { inviteCodeId: invite.id, userId },
      }),
    ]);

    // Initialize module lock status for first module
    const firstModule = await prisma.module.findFirst({
      where: { courseId: invite.courseId },
      orderBy: { order: "asc" },
    });
    if (firstModule) {
      await prisma.moduleLockStatus.upsert({
        where: { userId_moduleId: { userId, moduleId: firstModule.id } },
        update: {},
        create: {
          userId,
          moduleId: firstModule.id,
          isUnlocked: !firstModule.requiresPreTest,
          lockReason: firstModule.requiresPreTest ? "AWAITING_PRETEST" : "UNLOCKED",
        },
      });
    }

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
}

export const courseService = new CourseService();