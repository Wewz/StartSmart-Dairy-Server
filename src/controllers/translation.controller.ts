import { Response } from "express";
import { AuthenticatedRequest } from "@/types";
import { ok, serverError } from "@/utils/reponse";
import { translate } from "@/services/translation.service";

export const translateText = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { text, from, to, format } = req.body as {
      text: string;
      from: "en" | "fil";
      to: "en" | "fil";
      format?: "plain" | "html";
    };

    const translatedText = await translate(text, from, to, format);
    return ok(res, { translatedText });
  } catch (err: any) {
    if (err.code === "RATE_LIMITED") {
      return res.status(429).json({
        success: false,
        message:
          "Translation rate limited. Please enter the translation manually.",
        code: "RATE_LIMITED",
      });
    }
    console.error("Translation error:", err.message);
    return serverError(res, "Translation failed");
  }
};
