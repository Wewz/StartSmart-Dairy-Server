-- Fix column naming from previous migration (snake_case -> camelCase)
-- This migration is idempotent — safe to run whether or not the previous migration was applied

-- 1. Rename deletedAt columns (if they exist as snake_case)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'module_tasks' AND column_name = 'deleted_at') THEN
    ALTER TABLE "module_tasks" RENAME COLUMN "deleted_at" TO "deletedAt";
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'module_tasks' AND column_name = 'deletedAt') THEN
    ALTER TABLE "module_tasks" ADD COLUMN "deletedAt" TIMESTAMP(3);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lesson_sections' AND column_name = 'deleted_at') THEN
    ALTER TABLE "lesson_sections" RENAME COLUMN "deleted_at" TO "deletedAt";
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lesson_sections' AND column_name = 'deletedAt') THEN
    ALTER TABLE "lesson_sections" ADD COLUMN "deletedAt" TIMESTAMP(3);
  END IF;
END $$;

-- 2. Rename attemptNum column (if it exists as snake_case)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'task_submissions' AND column_name = 'attempt_num') THEN
    ALTER TABLE "task_submissions" RENAME COLUMN "attempt_num" TO "attemptNum";
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'task_submissions' AND column_name = 'attemptNum') THEN
    ALTER TABLE "task_submissions" ADD COLUMN "attemptNum" INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

-- 3. Fix CHECK constraints (drop old, add correct)
ALTER TABLE "module_items" DROP CONSTRAINT IF EXISTS "module_items_exactly_one_target_chk";
ALTER TABLE "module_items" DROP CONSTRAINT IF EXISTS "module_items_type_target_match_chk";

ALTER TABLE "module_items"
ADD CONSTRAINT "module_items_exactly_one_target_chk"
CHECK (
  (("lessonId" IS NOT NULL)::int + ("quizId" IS NOT NULL)::int + ("taskId" IS NOT NULL)::int) = 1
);

ALTER TABLE "module_items"
ADD CONSTRAINT "module_items_type_target_match_chk"
CHECK (
  (type = 'LESSON' AND "lessonId" IS NOT NULL AND "quizId" IS NULL AND "taskId" IS NULL) OR
  (type = 'QUIZ'   AND "quizId"   IS NOT NULL AND "lessonId" IS NULL AND "taskId" IS NULL) OR
  (type = 'TASK'   AND "taskId"   IS NOT NULL AND "lessonId" IS NULL AND "quizId" IS NULL)
);

-- 4. Fix unique constraint and index
ALTER TABLE "task_submissions" DROP CONSTRAINT IF EXISTS "task_submissions_task_id_user_id_attempt_num_key";
ALTER TABLE "task_submissions" DROP CONSTRAINT IF EXISTS "task_submissions_taskId_userId_attemptNum_key";
ALTER TABLE "task_submissions" DROP CONSTRAINT IF EXISTS "task_submissions_taskId_userId_key";
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_taskId_userId_attemptNum_key" UNIQUE ("taskId", "userId", "attemptNum");

DROP INDEX IF EXISTS "task_submissions_task_id_user_id_idx";
DROP INDEX IF EXISTS "task_submissions_taskId_userId_idx";
CREATE INDEX IF NOT EXISTS "task_submissions_taskId_userId_idx" ON "task_submissions"("taskId", "userId");
