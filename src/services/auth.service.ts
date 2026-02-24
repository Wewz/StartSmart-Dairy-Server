import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  comparePassword,
  signToken,
  hashOtp,
  compareOtp,
} from "@/lib/auth";
import { sendOtpEmail } from "@/lib/mailer";
import { generateOtp, generateDeviceFingerprint } from "@/utils/helpers";
import { RegisterDto, LoginDto, VerifyOtpDto, GoogleAuthDto } from "@/types";
import { Language, Region } from "@prisma/client";
import { UpdateProfileDto } from "@/types";
import { OAuth2Client } from "google-auth-library";

const validLanguages = Object.values(Language);
const validRegions = Object.values(Region);

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export class AuthService {
  async googleAuth(dto: GoogleAuthDto) {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new Error("Google OAuth is not configured on this server");
    }

    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: dto.idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new Error("Invalid Google token");
    }

    const { email, name, picture, sub: googleId } = payload;

    // Find or create the user
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name ?? null,
          image: picture ?? null,
          emailVerified: new Date(), // Google emails are pre-verified
          accounts: {
            create: {
              type: "oauth",
              provider: "google",
              providerAccountId: googleId,
            },
          },
        },
      });
    } else {
      // Update profile picture if changed
      if (picture && user.image !== picture) {
        await prisma.user.update({
          where: { id: user.id },
          data: { image: picture },
        });
        user = { ...user, image: picture };
      }

      // Ensure Google account link exists
      const accountExists = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: "google",
            providerAccountId: googleId,
          },
        },
      });
      if (!accountExists) {
        await prisma.account.create({
          data: {
            userId: user.id,
            type: "oauth",
            provider: "google",
            providerAccountId: googleId,
          },
        });
      }
    }

    if (!user.isActive) throw new Error("Account is deactivated");

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        language: user.language,
        image: user.image,
      },
    };
  }

  async register(dto: RegisterDto) {
    const existing = await prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new Error("Email already registered");

    const hashed = await hashPassword(dto.password);
    const user = await prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashed,
        language: dto.language ?? "ENGLISH",
        region: dto.region,
        phoneNumber: dto.phoneNumber,
      },
      select: { id: true, name: true, email: true, role: true, language: true },
    });

    // Send email verification OTP
    const code = generateOtp();
    const hashed_code = await hashOtp(code);
    await prisma.otpChallenge.create({
      data: {
        userId: user.id,
        email: user.email,
        code: hashed_code,
        purpose: "EMAIL_VERIFICATION",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    await sendOtpEmail(user.email, code, "EMAIL_VERIFICATION");

    return user;
  }

  async login(dto: LoginDto, ipAddress?: string) {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.password) throw new Error("Invalid credentials");
    if (!user.isActive) throw new Error("Account is deactivated");

    const valid = await comparePassword(dto.password, user.password);
    if (!valid) throw new Error("Invalid credentials");

    if (!user.emailVerified) throw new Error("Please verify your email first");

    // Check if device is known
    const knownDevice = await prisma.deviceSession.findFirst({
      where: {
        userId: user.id,
        deviceFingerprint: dto.deviceFingerprint,
        isActive: true,
      },
    });

    if (!knownDevice) {
      // Send OTP for new device
      const code = generateOtp();
      const hashedCode = await hashOtp(code);
      await prisma.otpChallenge.create({
        data: {
          userId: user.id,
          email: user.email,
          code: hashedCode,
          purpose: "NEW_DEVICE_LOGIN",
          pendingDeviceFingerprint: dto.deviceFingerprint,
          pendingDeviceLabel: dto.deviceLabel,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });
      await sendOtpEmail(user.email, code, "NEW_DEVICE_LOGIN");
      return { requiresOtp: true, email: user.email };
    }

    // Update last seen
    await prisma.deviceSession.update({
      where: { id: knownDevice.id },
      data: { lastSeenAt: new Date(), ipAddress },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    return {
      requiresOtp: false,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        language: user.language,
      },
    };
  }

  async verifyOtp(dto: VerifyOtpDto, ipAddress?: string) {
    const challenge = await prisma.otpChallenge.findFirst({
      where: {
        email: dto.email,
        purpose: dto.purpose,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!challenge) throw new Error("OTP not found or expired");
    if (challenge.attempts >= 5) {
      await prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { isUsed: true },
      });
      throw new Error("Too many attempts. Please request a new OTP.");
    }

    const valid = await compareOtp(dto.code, challenge.code);
    if (!valid) {
      await prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw new Error("Invalid OTP code");
    }

    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { isUsed: true },
    });

    const user = await prisma.user.findUnique({
      where: { id: challenge.userId },
    });
    if (!user) throw new Error("User not found");

    if (dto.purpose === "EMAIL_VERIFICATION") {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    }

    if (
      dto.purpose === "NEW_DEVICE_LOGIN" &&
      challenge.pendingDeviceFingerprint
    ) {
      await prisma.deviceSession.create({
        data: {
          userId: user.id,
          deviceFingerprint: challenge.pendingDeviceFingerprint,
          deviceLabel: challenge.pendingDeviceLabel,
          ipAddress,
          isActive: true,
        },
      });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        language: user.language,
      },
    };
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return; // Silent fail for security

    const code = generateOtp();
    const hashedCode = await hashOtp(code);
    await prisma.otpChallenge.create({
      data: {
        userId: user.id,
        email,
        code: hashedCode,
        purpose: "PASSWORD_RESET",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    await sendOtpEmail(email, code, "PASSWORD_RESET");
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const challenge = await prisma.otpChallenge.findFirst({
      where: {
        email,
        purpose: "PASSWORD_RESET",
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!challenge) throw new Error("Invalid or expired reset code");

    const valid = await compareOtp(code, challenge.code);
    if (!valid) throw new Error("Invalid code");

    const hashed = await hashPassword(newPassword);
    await Promise.all([
      prisma.user.update({
        where: { id: challenge.userId },
        data: { password: hashed },
      }),
      prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { isUsed: true },
      }),
    ]);
  }

  async getMe(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        language: true,
        region: true,
        phoneNumber: true,
        image: true,
        emailVerified: true,
        createdAt: true,
      },
    });
  }

  async updateProfile(userId: string, data: UpdateProfileDto) {
    return prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        language: true,
        region: true,
        phoneNumber: true,
        image: true,
      },
    });
  }
}

export const authService = new AuthService();
