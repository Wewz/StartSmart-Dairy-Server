-- Critical Gap Fixes: CHECK constraints, soft-delete fields, TaskSubmission attemptNum

-- 1. CHECK constraint: ModuleItem must reference exactly one target
ALTER TABLE "module_items"
ADD CONSTRAINT "module_items_exactly_one_target_chk"
CHECK (
  (("lessonId" IS NOT NULL)::int + ("quizId" IS NOT NULL)::int + ("taskId" IS NOT NULL)::int) = 1
);

-- 2. CHECK constraint: ModuleItem type must match the non-null target
ALTER TABLE "module_items"
ADD CONSTRAINT "module_items_type_target_match_chk"
CHECK (
  (type = 'LESSON' AND "lessonId" IS NOT NULL AND "quizId" IS NULL AND "taskId" IS NULL) OR
  (type = 'QUIZ'   AND "quizId"   IS NOT NULL AND "lessonId" IS NULL AND "taskId" IS NULL) OR
  (type = 'TASK'   AND "taskId"   IS NOT NULL AND "lessonId" IS NULL AND "quizId" IS NULL)
);

-- 3. Add deletedAt to ModuleTask (soft-delete for tasks with student submissions)
ALTER TABLE "module_tasks" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- 4. Add deletedAt to LessonSection (soft-delete for sections with materials/progress)
ALTER TABLE "lesson_sections" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- 5. Add attemptNum to TaskSubmission (support resubmission after RETURNED status)
ALTER TABLE "task_submissions" ADD COLUMN "attemptNum" INTEGER NOT NULL DEFAULT 1;

-- 6. Drop old unique constraint (taskId, userId) and create new one with attemptNum
ALTER TABLE "task_submissions" DROP CONSTRAINT IF EXISTS "task_submissions_taskId_userId_key";
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_taskId_userId_attemptNum_key" UNIQUE ("taskId", "userId", "attemptNum");

-- 7. Add index for fast lookup of a student's submissions for a task
CREATE INDEX IF NOT EXISTS "task_submissions_taskId_userId_idx" ON "task_submissions"("taskId", "userId");
