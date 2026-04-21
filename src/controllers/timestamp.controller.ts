import { Response } from "express";
import { AuthenticatedRequest } from "@/types";
import { ok, created, badRequest, notFound, serverError } from "@/utils/reponse";
import { param } from "@/utils/helpers";
import { timestampService } from "@/services/timestamp.service";
import { generateTimestamps } from "@/services/ai.service";
import { prisma } from "@/lib/prisma";
import {
  createTimestampSchema,
  updateTimestampSchema,
  reorderTimestampsSchema,
  generateTimestampsSchema,
  bulkSaveTimestampsSchema,
} from "@/validation/timestamp.validation";

export const listTimestamps = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const timestamps = await timestampService.listByLesson(param(req.params.lessonId));
    return ok(res, timestamps);
  } catch (err: any) {
    return serverError(res, err.message);
  }
};

export const listBlockTimestamps = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const timestamps = await timestampService.listByBlock(param(req.params.blockId));
    return ok(res, timestamps);
  } catch (err: any) {
    return serverError(res, err.message);
  }
};

export const createBlockTimestamp = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Validate the text/label fields only; blockId comes from route.
    const parsed = createTimestampSchema
      .omit({ lessonId: true, lessonSectionId: true } as any)
      .safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error.message);
    const ts = await timestampService.createForBlock(param(req.params.blockId), parsed.data as any);
    return created(res, ts);
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const reorderBlockTimestamps = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = reorderTimestampsSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error.message);
    const result = await timestampService.reorderForBlock(
      param(req.params.blockId),
      (parsed.data as any).orderedIds,
    );
    return ok(res, { reordered: result.length });
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const bulkSaveBlockTimestamps = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = bulkSaveTimestampsSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error.message);
    const data = parsed.data as any;
    const result = await timestampService.bulkSaveForBlock(
      param(req.params.blockId),
      data.timestamps,
      !!data.replacePrevious,
    );
    return ok(res, result);
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const createTimestamp = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = createTimestampSchema.safeParse({
      ...req.body,
      lessonId: param(req.params.lessonId),
    });
    if (!parsed.success) return badRequest(res, parsed.error.message);

    const timestamp = await timestampService.create(parsed.data);
    return created(res, timestamp);
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const updateTimestamp = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = updateTimestampSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error.message);

    const timestamp = await timestampService.update(param(req.params.id), parsed.data);
    return ok(res, timestamp);
  } catch (err: any) {
    if (err.message === "Timestamp not found") return notFound(res, err.message);
    return badRequest(res, err.message);
  }
};

export const deleteTimestamp = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await timestampService.delete(param(req.params.id));
    return ok(res, null, "Timestamp deleted");
  } catch (err: any) {
    if (err.message === "Timestamp not found") return notFound(res, err.message);
    return serverError(res, err.message);
  }
};

export const reorderTimestamps = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = reorderTimestampsSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error.message);

    const result = await timestampService.reorder(
      param(req.params.lessonId),
      parsed.data.orderedIds,
    );
    return ok(res, result);
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const generateAiTimestamps = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = generateTimestampsSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error.message);

    const lessonId = param(req.params.lessonId);
    const language = parsed.data.language === "fil" ? "FILIPINO" : "ENGLISH";

    // Fetch transcript for this lesson
    const transcript = await prisma.videoTranscript.findUnique({
      where: { lessonId_language: { lessonId, language } },
    });
    if (!transcript) {
      return badRequest(res, "No transcript found for this lesson. Generate a transcript first.");
    }

    // Parse transcript content (stored as JSON array)
    let entries: Array<{ start_time: string; end_time: string; text: string }>;
    try {
      entries = JSON.parse(transcript.content);
    } catch {
      return badRequest(res, "Transcript content is not valid JSON");
    }

    const { timestamps, modelUsed } = await generateTimestamps(entries);

    // Tag generated timestamps with the section context if provided
    const tagged = timestamps.map((ts) => ({
      ...ts,
      lessonSectionId: parsed.data.lessonSectionId,
      generatedByAi: true,
    }));

    return ok(res, { timestamps: tagged, modelUsed });
  } catch (err: any) {
    if (err.code === "RATE_LIMITED") {
      return res.status(429).json({
        success: false,
        message: "AI models are rate-limited. Please try again later.",
        code: "RATE_LIMITED",
      });
    }
    return serverError(res, err.message);
  }
};

export const bulkSaveTimestamps = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = bulkSaveTimestampsSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error.message);

    const lessonId = param(req.params.lessonId);

    // Determine section context from first timestamp (all should be same section)
    const lessonSectionId = parsed.data.timestamps[0]?.lessonSectionId;

    const saved = await timestampService.bulkSave(
      lessonId,
      parsed.data.timestamps,
      parsed.data.replacePrevious,
      lessonSectionId,
    );

    return created(res, saved);
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};
