import { Request, Response } from "express";
import { authService } from "@/services/auth.service";
import { AuthenticatedRequest } from "@/types";
import { ok, created, badRequest, serverError } from "@/utils/reponse";
import { Language, Region } from "@prisma/client";
import { UpdateProfileDto } from "@/types";

export const googleAuth = async (req: Request, res: Response) => {
  try {
    const result = await authService.googleAuth({ idToken: req.body.idToken });
    return ok(res, result, "Authenticated successfully");
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const user = await authService.register(req.body);
    return created(
      res,
      user,
      "Registration successful. Please verify your email.",
    );
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const result = await authService.login(req.body, ipAddress);
    return ok(res, result);
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const result = await authService.verifyOtp(req.body, ipAddress);
    return ok(res, result, "OTP verified successfully");
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    await authService.forgotPassword(req.body.email);
    return ok(res, null, "If that email exists, a reset code has been sent.");
  } catch (err: any) {
    return serverError(res, err.message);
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;
    await authService.resetPassword(email, code, newPassword);
    return ok(res, null, "Password reset successfully");
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await authService.getMe(req.user!.userId);
    return ok(res, user);
  } catch (err: any) {
    return serverError(res, err.message);
  }
};

export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { name, language, region, phoneNumber, image } = req.body;

    const dto: UpdateProfileDto = {
      ...(name !== undefined && { name: name as string }),
      ...(language !== undefined && { language: language as Language }),
      ...(region !== undefined && { region: region as Region }),
      ...(phoneNumber !== undefined && { phoneNumber: phoneNumber as string }),
      ...(image !== undefined && { image: image as string }),
    };

    const user = await authService.updateProfile(req.user!.userId, dto);
    return ok(res, user);
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};
