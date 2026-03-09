-- CreateEnum
CREATE TYPE "ModuleItemType" AS ENUM ('LESSON', 'QUIZ', 'TASK');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('OUTPUT_SUBMISSION', 'REFLECTION', 'ACTIVITY');

-- CreateEnum
CREATE TYPE "TaskSubmissionStatus" AS ENUM ('SUBMITTED', 'REVIEWED', 'RETURNED');

-- AlterTable
ALTER TABLE "attempt_answers" ADD COLUMN     "gradingData" JSONB,
ADD COLUMN     "manualFeedback" TEXT,
ADD COLUMN     "manualScore" INTEGER,
ADD COLUMN     "textAnswer" TEXT;

-- AlterTable
ALTER TABLE "course_materials" ADD COLUMN     "fileId" TEXT,
ADD COLUMN     "fileSizeBytes" INTEGER,
ADD COLUMN     "lessonSectionId" TEXT,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "originalName" TEXT,
ADD COLUMN     "previewUrl" TEXT;

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "bannerFileId" TEXT,
ADD COLUMN     "bannerUrl" TEXT;

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "bannerFileId" TEXT,
ADD COLUMN     "bannerUrl" TEXT;

-- AlterTable
ALTER TABLE "modules" ADD COLUMN     "bannerFileId" TEXT,
ADD COLUMN     "bannerUrl" TEXT;

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "maxScore" INTEGER,
ADD COLUMN     "questionType" "QuestionType" NOT NULL DEFAULT 'MULTIPLE_CHOICE',
ADD COLUMN     "rubricEn" TEXT,
ADD COLUMN     "rubricFil" TEXT;

-- AlterTable
ALTER TABLE "quiz_attempts" ADD COLUMN     "isFullyGraded" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "requiresGrading" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "module_items" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "type" "ModuleItemType" NOT NULL,
    "order" INTEGER NOT NULL,
    "lessonId" TEXT,
    "quizId" TEXT,
    "taskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_sections" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "headingEn" TEXT NOT NULL,
    "headingFil" TEXT,
    "bodyEn" TEXT,
    "bodyFil" TEXT,
    "imageUrl" TEXT,
    "imageFileId" TEXT,
    "imageAltEn" TEXT,
    "imageAltFil" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_tasks" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleFil" TEXT,
    "descriptionEn" TEXT,
    "descriptionFil" TEXT,
    "taskType" "TaskType" NOT NULL,
    "maxScore" INTEGER,
    "dueAt" TIMESTAMP(3),
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "requiresReview" BOOLEAN NOT NULL DEFAULT true,
    "allowResubmission" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_submissions" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "submissionText" TEXT,
    "submissionUrl" TEXT,
    "submissionFileId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "TaskSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "score" INTEGER,
    "feedback" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,

    CONSTRAINT "task_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_transcripts" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "language" "Language" NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT,
    "generatedByAi" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_transcripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_item_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleItemId" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_item_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "module_items_lessonId_key" ON "module_items"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "module_items_quizId_key" ON "module_items"("quizId");

-- CreateIndex
CREATE UNIQUE INDEX "module_items_taskId_key" ON "module_items"("taskId");

-- CreateIndex
CREATE INDEX "module_items_moduleId_type_idx" ON "module_items"("moduleId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "module_items_moduleId_order_key" ON "module_items"("moduleId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_sections_lessonId_order_key" ON "lesson_sections"("lessonId", "order");

-- CreateIndex
CREATE INDEX "module_tasks_moduleId_idx" ON "module_tasks"("moduleId");

-- CreateIndex
CREATE INDEX "task_submissions_userId_idx" ON "task_submissions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "task_submissions_taskId_userId_key" ON "task_submissions"("taskId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "video_transcripts_lessonId_language_key" ON "video_transcripts"("lessonId", "language");

-- CreateIndex
CREATE INDEX "module_item_progress_moduleItemId_idx" ON "module_item_progress"("moduleItemId");

-- CreateIndex
CREATE UNIQUE INDEX "module_item_progress_userId_moduleItemId_key" ON "module_item_progress"("userId", "moduleItemId");

-- AddForeignKey
ALTER TABLE "course_materials" ADD CONSTRAINT "course_materials_lessonSectionId_fkey" FOREIGN KEY ("lessonSectionId") REFERENCES "lesson_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_items" ADD CONSTRAINT "module_items_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_items" ADD CONSTRAINT "module_items_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_items" ADD CONSTRAINT "module_items_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_items" ADD CONSTRAINT "module_items_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "module_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_sections" ADD CONSTRAINT "lesson_sections_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_tasks" ADD CONSTRAINT "module_tasks_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "module_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_transcripts" ADD CONSTRAINT "video_transcripts_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_item_progress" ADD CONSTRAINT "module_item_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_item_progress" ADD CONSTRAINT "module_item_progress_moduleItemId_fkey" FOREIGN KEY ("moduleItemId") REFERENCES "module_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
