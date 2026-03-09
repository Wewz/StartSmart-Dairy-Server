import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { validationError } from "@/utils/reponse";

type ValidationSchemas = {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
};

export const validateRequest = (schemas: ValidationSchemas) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const bodyResult = schemas.body?.safeParse(req.body);
    if (bodyResult && !bodyResult.success) {
      return validationError(
        res,
        bodyResult.error.issues.map((i) => i.message).join("; "),
      );
    }

    const paramsResult = schemas.params?.safeParse(req.params);
    if (paramsResult && !paramsResult.success) {
      return validationError(
        res,
        paramsResult.error.issues.map((i) => i.message).join("; "),
      );
    }

    const queryResult = schemas.query?.safeParse(req.query);
    if (queryResult && !queryResult.success) {
      return validationError(
        res,
        queryResult.error.issues.map((i) => i.message).join("; "),
      );
    }

    if (bodyResult?.success) req.body = bodyResult.data;
    if (paramsResult?.success)
      req.params = paramsResult.data as Request["params"];
    if (queryResult?.success) req.query = queryResult.data as Request["query"];

    next();
  };
};
