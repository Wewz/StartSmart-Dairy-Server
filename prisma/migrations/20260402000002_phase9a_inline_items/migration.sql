-- Phase 9A: Inline Items on ModuleItem
-- Allows tasks/quizzes to be embedded inside a lesson canvas

ALTER TABLE "module_items"
  ADD COLUMN IF NOT EXISTS "inlineLessonId" TEXT,
  ADD COLUMN IF NOT EXISTS "inlineOrder" INTEGER;

ALTER TABLE "module_items"
  ADD CONSTRAINT "module_items_inlineLessonId_fkey"
    FOREIGN KEY ("inlineLessonId") REFERENCES "lessons"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "module_items_inlineLessonId_idx"
  ON "module_items"("inlineLessonId");
