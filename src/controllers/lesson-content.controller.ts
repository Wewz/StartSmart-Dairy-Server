import { Response } from "express";
import { AuthenticatedRequest } from "@/types";
import { param } from "@/utils/helpers";
import {
  badRequest,
  created,
  notFound,
  ok,
  serverError,
} from "@/utils/reponse";
import { Language } from "@prisma/client";
import { lessonContentService } from "@/services/lesson-content.service";

export const listSections = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const sections = await lessonContentService.listSections(
      param(req.params.lessonId),
    );
    return ok(res, sections);
  } catch (err: any) {
    return serverError(res, err.message, "INTERNAL_ERROR");
  }
};

export const createSection = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const section = await lessonContentService.createSection(
      param(req.params.lessonId),
      req.body,
    );
    return created(res, section);
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};

export const updateSection = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const section = await lessonContentService.updateSection(
      param(req.params.sectionId),
      req.body,
    );
    return ok(res, section);
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};

export const deleteSection = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    await lessonContentService.deleteSection(param(req.params.sectionId));
    return ok(res, null, "Lesson section deleted");
  } catch (err: any) {
    return serverError(res, err.message, "INTERNAL_ERROR");
  }
};

export const reorderSections = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const sections = await lessonContentService.reorderSections(
      param(req.params.lessonId),
      req.body.orderedIds,
    );
    return ok(res, sections, "Lesson sections reordered");
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};

export const listTranscripts = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const transcripts = await lessonContentService.listTranscripts(
      param(req.params.lessonId),
    );
    return ok(res, transcripts);
  } catch (err: any) {
    return serverError(res, err.message, "INTERNAL_ERROR");
  }
};

export const upsertTranscript = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const language = param(req.params.language) as Language;
    const transcript = await lessonContentService.upsertTranscript(
      param(req.params.lessonId),
      language,
      req.body,
    );
    return ok(res, transcript, "Transcript saved");
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};

export const deleteTranscript = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    await lessonContentService.deleteTranscript(param(req.params.transcriptId));
    return ok(res, null, "Transcript deleted");
  } catch (err: any) {
    return notFound(res, err.message, "NOT_FOUND");
  }
};
