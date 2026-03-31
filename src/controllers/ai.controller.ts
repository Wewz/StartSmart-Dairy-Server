import { Response } from "express";
import { AuthenticatedRequest } from "@/types";
import { ok, badRequest, serverError } from "@/utils/reponse";
import { prisma } from "@/lib/prisma";
import { Language } from "@prisma/client";
import {
  transcribeYouTube,
  gradeEssay,
  type TranscriptEntry,
} from "@/services/ai.service";

export const transcribeVideo = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { lessonId, youtubeId, language } = req.body as {
      lessonId: string;
      youtubeId: string;
      language?: "ENGLISH" | "FILIPINO";
    };

    const lang = language === "FILIPINO" ? "tl" : "en";
    const dbLang: Language = language === "FILIPINO" ? "FILIPINO" : "ENGLISH";

    const result = await transcribeYouTube(youtubeId, lang);

    // Format transcript entries into readable text content
    const content = result.transcript
      .map(
        (e: TranscriptEntry) => `[${e.start_time} - ${e.end_time}] ${e.text}`,
      )
      .join("\n");

    // Upsert transcript in DB
    const transcript = await prisma.videoTranscript.upsert({
      where: { lessonId_language: { lessonId, language: dbLang } },
      create: {
        lessonId,
        language: dbLang,
        content,
        source: result.source,
        generatedByAi: true,
      },
      update: {
        content,
        source: result.source,
        generatedByAi: true,
      },
    });

    return ok(res, {
      ...transcript,
      modelUsed: result.modelUsed,
      segmentCount: result.transcript.length,
    });
  } catch (err: any) {
    if (err.message?.startsWith("NO_CAPTIONS_AVAILABLE")) {
      return badRequest(
        res,
        "This video has no auto-generated captions available.",
        "BAD_REQUEST",
      );
    }
    if (err.code === "RATE_LIMITED") {
      return res.status(429).json({
        success: false,
        message: "AI rate limited. Please try again later.",
        code: "RATE_LIMITED",
      });
    }
    console.error("Transcription error:", err.message);
    return serverError(res, "Transcription failed");
  }
};

export const aiGradeEssay = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { attemptAnswerId, questionId } = req.body as {
      attemptAnswerId: string;
      questionId: string;
    };

    // Get the answer
    const answer = await prisma.attemptAnswer.findUnique({
      where: { id: attemptAnswerId },
    });
    if (!answer?.textAnswer) {
      return badRequest(res, "No essay text found for this answer");
    }

    // Get the question with rubric
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });
    if (!question) {
      return badRequest(res, "Question not found");
    }

    const rubric = question.rubricEn ?? "Grade based on quality, relevance, and clarity.";
    const maxScore = question.maxScore ?? question.points;

    const { grading, modelUsed } = await gradeEssay(
      answer.textAnswer,
      rubric,
      maxScore,
    );

    // Store AI grading data on the answer (admin still needs to confirm)
    await prisma.attemptAnswer.update({
      where: { id: attemptAnswerId },
      data: {
        gradingData: {
          ...grading,
          _meta: { modelUsed, generatedAt: new Date().toISOString() },
        },
      },
    });

    return ok(res, grading);
  } catch (err: any) {
    if (err.code === "RATE_LIMITED") {
      return res.status(429).json({
        success: false,
        message: "AI rate limited. Please grade manually.",
        code: "RATE_LIMITED",
      });
    }
    console.error("AI grading error:", err.message);
    return serverError(res, "AI grading failed");
  }
};
