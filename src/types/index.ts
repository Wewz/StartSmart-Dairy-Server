import { UserRole, Language, Region, CourseStatus, OutputType } from "@prisma/client";
import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  language?: Language;
  region?: Region;
  phoneNumber?: string;
}

export interface LoginDto {
  email: string;
  password: string;
  deviceFingerprint: string;
  deviceLabel?: string;
}

export interface VerifyOtpDto {
  email: string;
  code: string;
  purpose: "NEW_DEVICE_LOGIN" | "EMAIL_VERIFICATION" | "PASSWORD_RESET";
  deviceFingerprint?: string;
  deviceLabel?: string;
}

export interface GoogleAuthDto {
  idToken: string;
}

export interface CreateCourseDto {
  titleEn: string;
  titleFil: string;
  descriptionEn: string;
  descriptionFil: string;
  thumbnailUrl?: string;
  isInviteOnly?: boolean;
  order?: number;
}

export interface UpdateCourseDto {
  titleEn?: string;
  titleFil?: string;
  descriptionEn?: string;
  descriptionFil?: string;
  thumbnailUrl?: string;
  isInviteOnly?: boolean;
  order?: number;
  status?: CourseStatus;
}

export interface CreateModuleDto {
  courseId: string;
  titleEn: string;
  titleFil: string;
  descriptionEn?: string;
  descriptionFil?: string;
  order?: number;
  requiresPreTest?: boolean;
  requiresAllLessons?: boolean;
  requiresPostTest?: boolean;
  passingScoreToUnlock?: number;
}

export interface CreateLessonDto {
  moduleId: string;
  titleEn: string;
  titleFil: string;
  bodyEn?: string;
  bodyFil?: string;
  youtubeId?: string;
  mp4Url?: string;
  durationSecs?: number;
  order?: number;
}

export interface SubmitQuizDto {
  quizId: string;
  answers: Array<{
    questionId: string;
    selectedOptionId: string;
  }>;
}

export interface UpdateProgressDto {
  lessonId: string;
  watchedPercent: number;
  lastWatchedSecs: number;
}

export interface CreateThreadDto {
  moduleId: string;
  titleEn: string;
  titleFil?: string;
  bodyEn: string;
  bodyFil?: string;
}

export interface CreateReplyDto {
  body: string;
}

export interface SubmitOutputDto {
  type: OutputType;
  title: string;
  content?: string;
  fileUrl?: string;
  courseId?: string;
  moduleId?: string;
}

export interface ReviewOutputDto {
  status: "REVIEWED" | "RETURNED";
  adminComment?: string;
}

export interface AdminEnrollDto {
  userId: string;
  courseId: string;
}

export interface UpdateUserDto {
  role?: UserRole;
  isActive?: boolean;
  name?: string;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  search?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface UpdateProfileDto {
  name?: string;
  language?: Language;
  region?: Region | null;
  phoneNumber?: string;
  image?: string;
}
