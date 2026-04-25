import { Response } from "express";
import { certificateService } from "@/services/certificate.service";
import { AuthenticatedRequest } from "@/types";
import { ok, notFound, serverError } from "@/utils/reponse";
import { param } from "@/utils/helpers";

export const getMyCertificates = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const certs = await certificateService.getUserCertificates(req.user!.userId);
    return ok(res, certs);
  } catch (e: any) {
    return serverError(res, e.message);
  }
};

export const getCertificate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cert = await certificateService.getCertificate(param(req.params.id));
    if (!cert) return notFound(res, "Certificate not found");
    return ok(res, cert);
  } catch (e: any) {
    return serverError(res, e.message);
  }
};

export const verifyCertificate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cert = await certificateService.verifyCertificate(param(req.params.verificationId));
    if (!cert) return notFound(res, "Certificate not found");
    return ok(res, cert);
  } catch (e: any) {
    return serverError(res, e.message);
  }
};

export const generateCertificate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { courseId, score } = req.body;
    const cert = await certificateService.generateCertificate(req.user!.userId, courseId, score);
    return ok(res, cert);
  } catch (e: any) {
    return serverError(res, e.message);
  }
};
