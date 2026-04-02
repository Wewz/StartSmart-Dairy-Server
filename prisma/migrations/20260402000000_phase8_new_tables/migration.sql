-- Phase 8: New Tables (Additive)
-- VideoTimestamp, TaskRubricCriterion, TaskCriterionScore
-- Section-level video fields on lesson_sections

-- 1. New enums
DO $$ BEGIN
  CREATE TYPE "TimestampType" AS ENUM ('CHAPTER', 'SUBTITLE', 'DISCUSSION', 'KEY_TERM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "VideoPosition" AS ENUM ('ABOVE_BODY', 'BELOW_BODY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add video fields to lesson_sections
ALTER TABLE "lesson_sections"
  ADD COLUMN IF NOT EXISTS "youtubeId" TEXT,
  ADD COLUMN IF NOT EXISTS "mp4Url" TEXT,
  ADD COLUMN IF NOT EXISTS "videoPosition" "VideoPosition" NOT NULL DEFAULT 'ABOVE_BODY';

-- 3. Create video_timestamps table
CREATE TABLE IF NOT EXISTS "video_timestamps" (
  "id"              TEXT NOT NULL,
  "lessonId"        TEXT NOT NULL,
  "lessonSectionId" TEXT,
  "timestampSecs"   INTEGER NOT NULL,
  "labelEn"         TEXT NOT NULL,
  "labelFil"        TEXT,
  "noteEn"          TEXT,
  "noteFil"         TEXT,
  "type"            "TimestampType" NOT NULL DEFAULT 'CHAPTER',
  "generatedByAi"   BOOLEAN NOT NULL DEFAULT false,
  "order"           INTEGER NOT NULL DEFAULT 0,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "video_timestamps_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "video_timestamps"
  ADD CONSTRAINT "video_timestamps_lessonId_fkey"
    FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "video_timestamps"
  ADD CONSTRAINT "video_timestamps_lessonSectionId_fkey"
    FOREIGN KEY ("lessonSectionId") REFERENCES "lesson_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "video_timestamps_lessonId_timestampSecs_idx"
  ON "video_timestamps"("lessonId", "timestampSecs");

CREATE INDEX IF NOT EXISTS "video_timestamps_lessonSectionId_idx"
  ON "video_timestamps"("lessonSectionId");

-- 4. Create task_rubric_criteria table
CREATE TABLE IF NOT EXISTS "task_rubric_criteria" (
  "id"        TEXT NOT NULL,
  "taskId"    TEXT NOT NULL,
  "titleEn"   TEXT NOT NULL,
  "titleFil"  TEXT,
  "descEn"    TEXT,
  "descFil"   TEXT,
  "maxPoints" INTEGER NOT NULL,
  "order"     INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_rubric_criteria_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "task_rubric_criteria"
  ADD CONSTRAINT "task_rubric_criteria_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "module_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "task_rubric_criteria_taskId_order_idx"
  ON "task_rubric_criteria"("taskId", "order");

-- 5. Create task_criterion_scores table
CREATE TABLE IF NOT EXISTS "task_criterion_scores" (
  "id"           TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "criterionId"  TEXT NOT NULL,
  "score"        INTEGER NOT NULL,
  CONSTRAINT "task_criterion_scores_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "task_criterion_scores"
  ADD CONSTRAINT "task_criterion_scores_submissionId_fkey"
    FOREIGN KEY ("submissionId") REFERENCES "task_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_criterion_scores"
  ADD CONSTRAINT "task_criterion_scores_criterionId_fkey"
    FOREIGN KEY ("criterionId") REFERENCES "task_rubric_criteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "task_criterion_scores_submissionId_criterionId_key"
  ON "task_criterion_scores"("submissionId", "criterionId");
