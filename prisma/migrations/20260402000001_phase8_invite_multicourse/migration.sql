-- Phase 8: Invite Code Multi-Course (Breaking Change)
-- Migrates InviteCode from single courseId → InviteCodeCourse junction table

-- 1. Add bundleName column to invite_codes
ALTER TABLE "invite_codes" ADD COLUMN IF NOT EXISTS "bundleName" TEXT;

-- 2. Create invite_code_courses junction table
CREATE TABLE IF NOT EXISTS "invite_code_courses" (
  "id"           TEXT NOT NULL,
  "inviteCodeId" TEXT NOT NULL,
  "courseId"     TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invite_code_courses_pkey" PRIMARY KEY ("id")
);

-- 3. Migrate existing courseId values into junction table
INSERT INTO "invite_code_courses" ("id", "inviteCodeId", "courseId", "createdAt")
SELECT
  gen_random_uuid()::text,
  "id",
  "courseId",
  NOW()
FROM "invite_codes"
WHERE "courseId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- 4. Drop old FK constraint and courseId column
ALTER TABLE "invite_codes" DROP CONSTRAINT IF EXISTS "invite_codes_courseId_fkey";
ALTER TABLE "invite_codes" DROP COLUMN IF EXISTS "courseId";

-- 5. Add FK constraints on junction table
ALTER TABLE "invite_code_courses"
  ADD CONSTRAINT "invite_code_courses_inviteCodeId_fkey"
    FOREIGN KEY ("inviteCodeId") REFERENCES "invite_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invite_code_courses"
  ADD CONSTRAINT "invite_code_courses_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. Unique index
CREATE UNIQUE INDEX IF NOT EXISTS "invite_code_courses_inviteCodeId_courseId_key"
  ON "invite_code_courses"("inviteCodeId", "courseId");

-- 7. Drop old index that referenced courseId
DROP INDEX IF EXISTS "invite_codes_courseId_isActive_idx";

-- 8. Add new index
CREATE INDEX IF NOT EXISTS "invite_codes_isActive_idx"
  ON "invite_codes"("isActive");
