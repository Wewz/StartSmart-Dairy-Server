import { Response } from "express";
import { adminService } from "@/services/admin.service";
import { AuthenticatedRequest, UpdateUserDto } from "@/types";
import { ok, badRequest, notFound, serverError } from "@/utils/reponse";
import { param } from "@/utils/helpers";
import { UserRole } from "@prisma/client";

export const getDashboardStats = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const stats = await adminService.getDashboardStats();
    return ok(res, stats);
  } catch (err: any) {
    return serverError(res, err.message);
  }
};

export const listUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string | undefined;
    const role = req.query.role as UserRole | undefined;

    const result = await adminService.listUsers({ page, limit, search, role });
    return ok(res, result);
  } catch (err: any) {
    return serverError(res, err.message);
  }
};

export const getUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await adminService.getUser(param(req.params.id));
    return ok(res, user);
  } catch (err: any) {
    return notFound(res, err.message);
  }
};

export const updateUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dto: UpdateUserDto = {
      ...(req.body.role !== undefined && { role: req.body.role as UserRole }),
      ...(req.body.isActive !== undefined && { isActive: req.body.isActive as boolean }),
      ...(req.body.name !== undefined && { name: req.body.name as string }),
    };
    const user = await adminService.updateUser(param(req.params.id), dto);
    return ok(res, user);
  } catch (err: any) {
    return badRequest(res, err.message);
  }
};
