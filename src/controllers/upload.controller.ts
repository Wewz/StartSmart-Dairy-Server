import { Response } from "express";
import { AuthenticatedRequest } from "@/types";
import { badRequest, ok } from "@/utils/reponse";
import { storageService } from "@/services/storage.service";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "video/mp4",
  "audio/mpeg",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const createUploadUrl = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const {
      folder = "uploads",
      filename,
      mimeType,
    } = req.body as {
      folder?: string;
      filename?: string;
      mimeType?: string;
    };

    if (!filename?.trim()) {
      return badRequest(res, "filename is required", "BAD_REQUEST");
    }

    if (!mimeType || !ALLOWED_MIME.has(mimeType)) {
      return badRequest(res, "Unsupported mime type", "BAD_REQUEST");
    }

    const upload = await storageService.createUploadUrl({
      folder,
      filename,
      mimeType,
    });

    return ok(res, upload);
  } catch (err: any) {
    return badRequest(res, err.message, "BAD_REQUEST");
  }
};
