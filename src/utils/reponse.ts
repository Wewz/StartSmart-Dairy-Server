import { Response } from "express";

type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export const ok = (res: Response, data: unknown, message = "Success") =>
  res.status(200).json({ success: true, message, data });

export const created = (res: Response, data: unknown, message = "Created") =>
  res.status(201).json({ success: true, message, data });

export const badRequest = (
  res: Response,
  message = "Bad request",
  code: ApiErrorCode = "BAD_REQUEST",
) => res.status(400).json({ success: false, message, code });

export const validationError = (res: Response, message = "Validation failed") =>
  res.status(400).json({ success: false, message, code: "VALIDATION_ERROR" });

export const unauthorized = (
  res: Response,
  message = "Unauthorized",
  code: ApiErrorCode = "UNAUTHORIZED",
) => res.status(401).json({ success: false, message, code });

export const forbidden = (
  res: Response,
  message = "Forbidden",
  code: ApiErrorCode = "FORBIDDEN",
) => res.status(403).json({ success: false, message, code });

export const notFound = (
  res: Response,
  message = "Not found",
  code: ApiErrorCode = "NOT_FOUND",
) => res.status(404).json({ success: false, message, code });

export const conflict = (
  res: Response,
  message = "Conflict",
  code: ApiErrorCode = "CONFLICT",
) => res.status(409).json({ success: false, message, code });

export const serverError = (
  res: Response,
  message = "Internal server error",
  code: ApiErrorCode = "INTERNAL_ERROR",
) => res.status(500).json({ success: false, message, code });
