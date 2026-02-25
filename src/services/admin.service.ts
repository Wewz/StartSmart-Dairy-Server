import { prisma } from "@/lib/prisma";
import { UpdateUserDto } from "@/types";
import { UserRole } from "@prisma/client";
import { sendInviteEmail } from "@/lib/mailer";

export class AdminService {
  async listUsers(opts: {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
  }) {
    const page = opts.page ?? 1;
    const limit = Math.min(opts.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where = {
      ...(opts.search
        ? {
            OR: [
              { name: { contains: opts.search, mode: "insensitive" as const } },
              { email: { contains: opts.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(opts.role ? { role: opts.role } : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          language: true,
          region: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          _count: { select: { enrollments: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUser(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        language: true,
        region: true,
        phoneNumber: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        enrollments: {
          include: {
            course: { select: { id: true, slug: true, titleEn: true, titleFil: true } },
          },
        },
        _count: { select: { enrollments: true, quizAttempts: true } },
      },
    });
    if (!user) throw new Error("User not found");
    return user;
  }

  async updateUser(id: string, data: UpdateUserDto) {
    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        language: true,
        region: true,
      },
    });
  }

  async createUser(dto: { name: string; email: string; role: UserRole }) {
    const existing = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      // Already exists — just update their role
      return prisma.user.update({
        where: { email: dto.email },
        data: { role: dto.role },
      });
    }

    const user = await prisma.user.create({
      data: { name: dto.name, email: dto.email, role: dto.role },
    });

    const appUrl = process.env.CLIENT_URL ?? "http://localhost:3000";
    // Fire-and-forget — don't block on email failure
    sendInviteEmail(dto.email, dto.name, dto.role, appUrl).catch(console.error);

    return user;
  }

  async listEnrollments(opts: {
    page?: number;
    limit?: number;
    courseId?: string;
    userId?: string;
  }) {
    const page = opts.page ?? 1;
    const limit = Math.min(opts.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where = {
      ...(opts.courseId ? { courseId: opts.courseId } : {}),
      ...(opts.userId ? { userId: opts.userId } : {}),
    };

    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { enrolledAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          course: { select: { id: true, slug: true, titleEn: true, titleFil: true } },
        },
      }),
      prisma.enrollment.count({ where }),
    ]);

    return {
      enrollments,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getDashboardStats() {
    const [totalUsers, totalEnrollments, totalCourses, pendingOutputs] =
      await Promise.all([
        prisma.user.count({ where: { role: "STUDENT" } }),
        prisma.enrollment.count({ where: { status: "ACTIVE" } }),
        prisma.course.count({ where: { status: "PUBLISHED" } }),
        prisma.studentOutput.count({ where: { status: "PENDING" } }),
      ]);

    return { totalUsers, totalEnrollments, totalCourses, pendingOutputs };
  }
}

export const adminService = new AdminService();
