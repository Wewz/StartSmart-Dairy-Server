import { Response } from "express";
import { courseService } from "@/services/course.service";
import { AuthenticatedRequest, UpdateCourseDto, AdminEnrollDto } from "@/types";
import {
  ok,
  created,
  badRequest,
  serverError,
  notFound,
} from "@/utils/reponse";
import { param } from "@/utils/helpers";
import { CourseStatus } from "@prisma/client";

export const listCourses = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const courses = await courseService.listCourses(
      req.user!.userId,
      req.user!.role,
    );
    return ok(res, courses);
  } catch (err: any) {
    return serverError(res, err.message, "INTERNAL_ERROR");
  }
};

export const getCourse = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const course = await courseService.getCourse(
      param(req.params.slug),
      req.user!.userId,
      req.user!.role,
    );
    return ok(res, course);
  } catch (err: any) {
    return notFound(res, err.message, "NOT_FOUND");
  }
};

export const createCourse = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const course = await courseService.createCourse(req.body, req.user!.userId);
    return created(res, course);
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};

export const updateCourse = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const {
      titleEn,
      titleFil,
      descriptionEn,
      descriptionFil,
      thumbnailUrl,
      isInviteOnly,
      order,
      status,
    } = req.body;

    const dto: UpdateCourseDto = {
      ...(titleEn !== undefined && { titleEn: titleEn as string }),
      ...(titleFil !== undefined && { titleFil: titleFil as string }),
      ...(descriptionEn !== undefined && {
        descriptionEn: descriptionEn as string,
      }),
      ...(descriptionFil !== undefined && {
        descriptionFil: descriptionFil as string,
      }),
      ...(thumbnailUrl !== undefined && {
        thumbnailUrl: thumbnailUrl as string,
      }),
      ...(isInviteOnly !== undefined && {
        isInviteOnly: isInviteOnly as boolean,
      }),
      ...(order !== undefined && { order: order as number }),
      ...(status !== undefined && { status: status as CourseStatus }),
    };

    const course = await courseService.updateCourse(param(req.params.id), dto);
    return ok(res, course);
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};

export const deleteCourse = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    await courseService.deleteCourse(param(req.params.id));
    return ok(res, null, "Course deleted");
  } catch (err: any) {
    return serverError(res, err.message, "INTERNAL_ERROR");
  }
};

// Modules
export const listModules = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const modules = await courseService.listModules(
      param(req.params.courseId),
      req.user!.userId,
      req.user!.role,
    );
    return ok(res, modules);
  } catch (err: any) {
    return serverError(res, err.message);
  }
};

export const getModule = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const module = await courseService.getModule(
      param(req.params.id),
      req.user!.userId,
      req.user!.role,
    );
    return ok(res, module);
  } catch (err: any) {
    return notFound(res, err.message, "NOT_FOUND");
  }
};

export const createModule = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const module = await courseService.createModule(req.body);
    return created(res, module);
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};

export const updateModule = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const module = await courseService.updateModule(
      param(req.params.id),
      req.body,
    );
    return ok(res, module);
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const deleteModule = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    await courseService.deleteModule(param(req.params.id));
    return ok(res, null, "Module deleted");
  } catch (err: any) {
    return serverError(res, err.message, "INTERNAL_ERROR");
  }
};

// Lessons
export const createLesson = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lesson = await courseService.createLesson(req.body);
    return created(res, lesson);
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const getLesson = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lesson = await courseService.getLesson(
      param(req.params.id),
      req.user!.userId,
    );
    return ok(res, lesson);
  } catch (err: any) {
    if (err.message === "Lesson not found") {
      return notFound(res, err.message, "NOT_FOUND");
    }
    console.error("getLesson error:", err);
    return serverError(res, err.message, "INTERNAL_ERROR");
  }
};

export const updateLesson = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lesson = await courseService.updateLesson(
      param(req.params.id),
      req.body,
    );
    return ok(res, lesson);
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};

export const deleteLesson = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    await courseService.deleteLesson(param(req.params.id));
    return ok(res, null, "Lesson deleted");
  } catch (err: any) {
    return serverError(res, err.message);
  }
};

// Invite Codes (backward-compat course-scoped endpoints)
export const createInviteCode = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { inviteCodeService } = await import("@/services/invite-code.service");
    const { courseId, usageLimit, expiresAt, note } = req.body;
    if (!courseId) return badRequest(res, "courseId is required", "BAD_REQUEST");
    const code = await inviteCodeService.create(
      { courseIds: [courseId], usageLimit, expiresAt, note },
      req.user!.userId,
    );
    return created(res, code);
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};

export const listInviteCodes = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { inviteCodeService } = await import("@/services/invite-code.service");
    const codes = await inviteCodeService.list(param(req.params.courseId));
    return ok(res, codes);
  } catch (err: any) {
    return serverError(res, err.message, "INTERNAL_ERROR");
  }
};

export const restoreLesson = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lesson = await courseService.restoreLesson(param(req.params.id));
    return ok(res, lesson, "Lesson restored");
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};

export const enrollWithCode = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const enrollment = await courseService.enrollWithCode(
      req.user!.userId,
      req.body.code,
    );
    return created(res, enrollment, "Enrolled successfully");
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

// Admin: enroll a user directly
export const adminEnrollUser = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const dto: AdminEnrollDto = {
      userId: req.body.userId,
      courseId: req.body.courseId,
    };
    const enrollment = await courseService.adminEnrollUser(
      dto,
      req.user!.userId,
    );
    return created(res, enrollment, "User enrolled successfully");
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};
