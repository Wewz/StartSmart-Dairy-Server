import { Request, Response, NextFunction } from "express";
import { serverError } from "@/utils/reponse";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error("[ErrorHandler]", err);
  return serverError(res, err.message || "Internal server error");
};

export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: "Route not found" });
};