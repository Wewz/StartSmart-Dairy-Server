-- Phase 11 — Page + ContentBlock schema
-- Additive only. Legacy Lesson/LessonSection stay intact until Phase 14.

-- Enums
CREATE TYPE "PageKind" AS ENUM ('LESSON', 'COVER', 'RESOURCE');
CREATE TYPE "BlockType" AS ENUM (
  'HEADING', 'PARAGRAPH', 'IMAGE', 'VIDEO', 'FILE',
  'DIVIDER', 'CALLOUT', 'TASK_REF', 'QUIZ_REF', 'EMBED'
);
CREATE TYPE "CalloutStyle" AS ENUM ('INFO', 'TIP', 'WARNING', 'NOTE');
ALTER TYPE "ModuleItemType" ADD VALUE IF NOT EXISTS 'PAGE';

-- pages
CREATE TABLE "pages" (
  "id"                TEXT NOT NULL,
  "moduleId"          TEXT NOT NULL,
  "kind"              "PageKind" NOT NULL DEFAULT 'LESSON',
  "titleEn"           TEXT NOT NULL,
  "titleFil"          TEXT NOT NULL,
  "slug"              TEXT,
  "bannerUrl"         TEXT,
  "bannerFileId"      TEXT,
  "durationSecs"      INTEGER,
  "status"            "LessonStatus" NOT NULL DEFAULT 'DRAFT',
  "requiresPrevious"  BOOLEAN NOT NULL DEFAULT true,
  "order"             INTEGER NOT NULL DEFAULT 0,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,
  "deletedAt"         TIMESTAMP(3),
  CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pages_moduleId_order_idx" ON "pages"("moduleId", "order");
ALTER TABLE "pages" ADD CONSTRAINT "pages_moduleId_fkey"
  FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- content_blocks
CREATE TABLE "content_blocks" (
  "id"            TEXT NOT NULL,
  "pageId"        TEXT NOT NULL,
  "type"          "BlockType" NOT NULL,
  "order"         INTEGER NOT NULL,
  "headingLevel"  INTEGER,
  "textEn"        TEXT,
  "textFil"       TEXT,
  "altEn"         TEXT,
  "altFil"        TEXT,
  "captionEn"     TEXT,
  "captionFil"    TEXT,
  "imageUrl"      TEXT,
  "imageFileId"   TEXT,
  "youtubeId"     TEXT,
  "mp4Url"        TEXT,
  "fileUrl"       TEXT,
  "fileId"        TEXT,
  "fileType"      "MaterialType",
  "fileSizeBytes" INTEGER,
  "mimeType"      TEXT,
  "originalName"  TEXT,
  "moduleItemId"  TEXT,
  "calloutStyle"  "CalloutStyle",
  "embedUrl"      TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  "deletedAt"     TIMESTAMP(3),
  CONSTRAINT "content_blocks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "content_blocks_moduleItemId_key" ON "content_blocks"("moduleItemId");
CREATE INDEX "content_blocks_pageId_order_idx" ON "content_blocks"("pageId", "order");
ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_pageId_fkey"
  FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_moduleItemId_fkey"
  FOREIGN KEY ("moduleItemId") REFERENCES "module_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- page_progress
CREATE TABLE "page_progress" (
  "id"              TEXT NOT NULL,
  "userId"          TEXT NOT NULL,
  "pageId"          TEXT NOT NULL,
  "scrolledPercent" INTEGER NOT NULL DEFAULT 0,
  "scrolledToEnd"   BOOLEAN NOT NULL DEFAULT false,
  "isCompleted"     BOOLEAN NOT NULL DEFAULT false,
  "completedAt"     TIMESTAMP(3),
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "page_progress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "page_progress_userId_pageId_key" ON "page_progress"("userId", "pageId");
CREATE INDEX "page_progress_pageId_idx" ON "page_progress"("pageId");
ALTER TABLE "page_progress" ADD CONSTRAINT "page_progress_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "page_progress" ADD CONSTRAINT "page_progress_pageId_fkey"
  FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- module_items.pageId + soft-delete
ALTER TABLE "module_items" ADD COLUMN "pageId" TEXT;
ALTER TABLE "module_items" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "module_items_pageId_key" ON "module_items"("pageId");
ALTER TABLE "module_items" ADD CONSTRAINT "module_items_pageId_fkey"
  FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- video_timestamps: lessonId becomes nullable, add blockId
ALTER TABLE "video_timestamps" ALTER COLUMN "lessonId" DROP NOT NULL;
ALTER TABLE "video_timestamps" ADD COLUMN "blockId" TEXT;
CREATE INDEX "video_timestamps_blockId_timestampSecs_idx" ON "video_timestamps"("blockId", "timestampSecs");
ALTER TABLE "video_timestamps" ADD CONSTRAINT "video_timestamps_blockId_fkey"
  FOREIGN KEY ("blockId") REFERENCES "content_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
