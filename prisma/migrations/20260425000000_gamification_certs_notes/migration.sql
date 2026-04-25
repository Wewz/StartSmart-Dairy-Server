-- AlterEnum: add CHECKLIST to QuestionType
ALTER TYPE "QuestionType" ADD VALUE 'CHECKLIST';

-- AlterEnum: add new NotificationType values
ALTER TYPE "NotificationType" ADD VALUE 'SUBMISSION_GRADED';
ALTER TYPE "NotificationType" ADD VALUE 'TRAINER_FEEDBACK';
ALTER TYPE "NotificationType" ADD VALUE 'DEADLINE_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'ACHIEVEMENT';

-- AlterTable: add gamification fields to users
ALTER TABLE "users" ADD COLUMN "currentStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "longestStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "lastActiveDate" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "xp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "level" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "users" ADD COLUMN "totalMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable: add explanation/timeLimit fields to questions
ALTER TABLE "questions" ADD COLUMN "explanationEn" TEXT;
ALTER TABLE "questions" ADD COLUMN "explanationFil" TEXT;
ALTER TABLE "questions" ADD COLUMN "timeLimitSecs" INTEGER;

-- CreateTable: daily_activities
CREATE TABLE "daily_activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "actions" INTEGER NOT NULL DEFAULT 1,
    "minutesActive" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "daily_activities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "daily_activities_userId_date_key" ON "daily_activities"("userId", "date");
CREATE INDEX "daily_activities_userId_idx" ON "daily_activities"("userId");

ALTER TABLE "daily_activities" ADD CONSTRAINT "daily_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: certificates
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" DOUBLE PRECISION NOT NULL,
    "verificationId" TEXT NOT NULL,
    "pdfUrl" TEXT,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "certificates_verificationId_key" ON "certificates"("verificationId");
CREATE UNIQUE INDEX "certificates_userId_courseId_key" ON "certificates"("userId", "courseId");
CREATE INDEX "certificates_verificationId_idx" ON "certificates"("verificationId");

ALTER TABLE "certificates" ADD CONSTRAINT "certificates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: student_notes
CREATE TABLE "student_notes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "timestampMs" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "student_notes_userId_lessonId_idx" ON "student_notes"("userId", "lessonId");

ALTER TABLE "student_notes" ADD CONSTRAINT "student_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_notes" ADD CONSTRAINT "student_notes_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
