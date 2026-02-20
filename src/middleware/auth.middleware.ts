import { Response, NextFunction } from "express";
import { verifyToken } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../types";
import { unauthorized, forbidden } from "../utils/reponse";
import { UserRole } from "@prisma/client";

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return unauthorized(res, "No token provided");
    }

    const token = authHeader.split(" ")[1];
    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return unauthorized(res, "User not found or inactive");
    }

    req.user = { userId: user.id, email: user.email, role: user.role };
    next();
  } catch {
    return unauthorized(res, "Invalid or expired token");
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role as UserRole)) {
      return forbidden(res, "Insufficient permissions");
    }
    next();
  };
};

export const requireAdmin = requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN);
export const requireInstructor = requireRole(
  UserRole.INSTRUCTOR,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN
);