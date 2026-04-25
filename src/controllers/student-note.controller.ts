import { Response } from "express";
import { studentNoteService } from "@/services/student-note.service";
import { AuthenticatedRequest } from "@/types";
import { ok, badRequest, serverError } from "@/utils/reponse";
import { param } from "@/utils/helpers";

export const getNotes = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const notes = await studentNoteService.getNotesForLesson(
      req.user!.userId,
      param(req.params.lessonId),
    );
    return ok(res, notes);
  } catch (e: any) {
    return serverError(res, e.message);
  }
};

export const createNote = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { timestampMs, text } = req.body;
    if (!text?.trim()) return badRequest(res, "Text is required");
    const note = await studentNoteService.createNote(
      req.user!.userId,
      param(req.params.lessonId),
      timestampMs ?? 0,
      text.trim(),
    );
    return ok(res, note);
  } catch (e: any) {
    return serverError(res, e.message);
  }
};

export const updateNote = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return badRequest(res, "Text is required");
    const note = await studentNoteService.updateNote(param(req.params.noteId), req.user!.userId, text.trim());
    return ok(res, note);
  } catch (e: any) {
    return serverError(res, e.message);
  }
};

export const deleteNote = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await studentNoteService.deleteNote(param(req.params.noteId), req.user!.userId);
    return ok(res, null);
  } catch (e: any) {
    return serverError(res, e.message);
  }
};
