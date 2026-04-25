import { prisma } from "../lib/prisma";
import { randomBytes } from "crypto";

function generateVerificationId(courseSlug: string): string {
  const prefix = "SSD";
  const courseCode = courseSlug
    .split("-")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 3);
  const year = new Date().getFullYear().toString().slice(-2);
  const seq = randomBytes(2).readUInt16BE(0).toString().padStart(4, "0");
  return `${prefix}-${courseCode}-${year}-${seq}`;
}

export class CertificateService {
  async getUserCertificates(userId: string) {
    return prisma.certificate.findMany({
      where: { userId },
      include: { course: { select: { titleEn: true, titleFil: true, slug: true } } },
      orderBy: { issuedAt: "desc" },
    });
  }

  async getCertificate(id: string) {
    return prisma.certificate.findUnique({
      where: { id },
      include: {
        course: { select: { titleEn: true, titleFil: true, slug: true } },
        user: { select: { name: true, email: true } },
      },
    });
  }

  async verifyCertificate(verificationId: string) {
    return prisma.certificate.findUnique({
      where: { verificationId },
      include: {
        course: { select: { titleEn: true, titleFil: true } },
        user: { select: { name: true } },
      },
    });
  }

  async generateCertificate(userId: string, courseId: string, score: number) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { slug: true },
    });
    if (!course) throw new Error("Course not found");

    const existing = await prisma.certificate.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (existing) return existing;

    return prisma.certificate.create({
      data: {
        userId,
        courseId,
        score,
        verificationId: generateVerificationId(course.slug),
      },
    });
  }
}

export const certificateService = new CertificateService();
