import { Response } from "express";
import { courseService } from "../services/course.service";
import { AuthenticatedRequest } from "../types";
import { ok, created, badRequest, serverError, notFound } from "../utils/reponse";

export const listCourses = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const courses = await courseService.listCourses(req.user!.userId, req.user!.role);
    return ok(res, courses);
  } catch (err: any) {
    return serverError(res, err.message);
  }
};

export const getCourse = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const course = await courseService.getCourse(req.params.slug, req.user!.userId, req.user!.role);
    return ok(res, course);
  } catch (err: any) {
    return notFound(res, err.message);
  }
};

export const createCourse = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const course = await courseService.createCourse(req.body, req.user!.userId);
    return created(res, course);
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const updateCourse = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const course = await courseService.updateCourse(req.params.id, req.body);
    return ok(res, course);
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const deleteCourse = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await courseService.deleteCourse(req.params.id);
    return ok(res, null, "Course deleted");
  } catch (err: any) {
    return serverError(res, err.message);
  }
};

// Modules
export const createModule = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const module = await courseService.createModule(req.body);
    return created(res, module);
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const updateModule = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const module = await courseService.updateModule(req.params.id, req.body);
    return ok(res, module);
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const deleteModule = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await courseService.deleteModule(req.params.id);
    return ok(res, null, "Module deleted");
  } catch (err: any) {
    return serverError(res, err.message);
  }
};

// Lessons
export const createLesson = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lesson = await courseService.createLesson(req.body);
    return created(res, lesson);
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const getLesson = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lesson = await courseService.getLesson(req.params.id, req.user!.userId);
    return ok(res, lesson);
  } catch (err: any) {
    return notFound(res, err.message);
  }
};

export const updateLesson = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lesson = await courseService.updateLesson(req.params.id, req.body);
    return ok(res, lesson);
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const deleteLesson = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await courseService.deleteLesson(req.params.id);
    return ok(res, null, "Lesson deleted");
  } catch (err: any) {
    return serverError(res, err.message);
  }
};

// Invite Codes
export const createInviteCode = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { courseId, usageLimit, expiresAt, note } = req.body;
    const code = await courseService.createInviteCode(courseId, req.user!.userId, {
      usageLimit, expiresAt: expiresAt ? new Date(expiresAt) : undefined, note,
    });
    return created(res, code);
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const listInviteCodes = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const codes = await courseService.listInviteCodes(req.params.courseId);
    return ok(res, codes);
  } catch (err: any) {
    return serverError(res, err.message);
  }
};

export const enrollWithCode = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const enrollment = await courseService.enrollWithCode(req.user!.userId, req.body.code);
    return created(res, enrollment, "Enrolled successfully");
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};