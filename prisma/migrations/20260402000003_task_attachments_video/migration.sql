-- Add youtubeId to module_tasks
ALTER TABLE "module_tasks" ADD COLUMN "youtube_id" TEXT;

-- Create task_attachments table
CREATE TABLE "task_attachments" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_fil" TEXT,
    "file_url" TEXT NOT NULL,
    "file_type" "MaterialType" NOT NULL,
    "file_id" TEXT,
    "file_size_bytes" INTEGER,
    "mime_type" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "task_attachments_task_id_idx" ON "task_attachments"("task_id");

ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_task_id_fkey"
  FOREIGN KEY ("task_id") REFERENCES "module_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
