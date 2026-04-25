import { prisma } from "../lib/prisma";

export class StudentNoteService {
  async getNotesForLesson(userId: string, lessonId: string) {
    return prisma.studentNote.findMany({
      where: { userId, lessonId },
      orderBy: { timestampMs: "asc" },
    });
  }

  async createNote(userId: string, lessonId: string, timestampMs: number, text: string) {
    return prisma.studentNote.create({
      data: { userId, lessonId, timestampMs, text },
    });
  }

  async updateNote(noteId: string, userId: string, text: string) {
    const note = await prisma.studentNote.findUnique({ where: { id: noteId } });
    if (!note || note.userId !== userId) throw new Error("Note not found");
    return prisma.studentNote.update({
      where: { id: noteId },
      data: { text },
    });
  }

  async deleteNote(noteId: string, userId: string) {
    const note = await prisma.studentNote.findUnique({ where: { id: noteId } });
    if (!note || note.userId !== userId) throw new Error("Note not found");
    return prisma.studentNote.delete({ where: { id: noteId } });
  }
}

export const studentNoteService = new StudentNoteService();
