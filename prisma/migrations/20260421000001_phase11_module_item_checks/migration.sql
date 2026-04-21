-- Phase 11 — update module_items CHECK constraints to know about PAGE + pageId

ALTER TABLE "module_items" DROP CONSTRAINT IF EXISTS "module_items_exactly_one_target_chk";
ALTER TABLE "module_items" DROP CONSTRAINT IF EXISTS "module_items_type_target_match_chk";

-- Exactly one of (lessonId, pageId, quizId, taskId) must be non-null (ignoring soft-deleted rows).
ALTER TABLE "module_items"
ADD CONSTRAINT "module_items_exactly_one_target_chk"
CHECK (
  "deletedAt" IS NOT NULL
  OR (
    (
      ("lessonId" IS NOT NULL)::int
      + ("pageId" IS NOT NULL)::int
      + ("quizId" IS NOT NULL)::int
      + ("taskId" IS NOT NULL)::int
    ) = 1
  )
);

ALTER TABLE "module_items"
ADD CONSTRAINT "module_items_type_target_match_chk"
CHECK (
  "deletedAt" IS NOT NULL
  OR (type = 'LESSON' AND "lessonId" IS NOT NULL AND "pageId" IS NULL AND "quizId" IS NULL AND "taskId" IS NULL)
  OR (type = 'PAGE'   AND "pageId"   IS NOT NULL AND "lessonId" IS NULL AND "quizId" IS NULL AND "taskId" IS NULL)
  OR (type = 'QUIZ'   AND "quizId"   IS NOT NULL AND "lessonId" IS NULL AND "pageId" IS NULL AND "taskId" IS NULL)
  OR (type = 'TASK'   AND "taskId"   IS NOT NULL AND "lessonId" IS NULL AND "pageId" IS NULL AND "quizId" IS NULL)
);
