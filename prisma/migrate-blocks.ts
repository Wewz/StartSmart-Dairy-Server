/**
 * Phase 11 — Data migration: Lesson/LessonSection → Page/ContentBlock
 *
 * Idempotent. Runs per Lesson in a transaction. Preserves ModuleItem IDs.
 * Does NOT delete the legacy Lesson/LessonSection rows (Phase 14 handles drop).
 *
 * Run after `prisma migrate deploy`:
 *   npx ts-node -r tsconfig-paths/register prisma/migrate-blocks.ts
 */

import { PrismaClient, BlockType, ModuleItemType } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function migrateLesson(lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      sections: { orderBy: { order: 'asc' } },
      materials: { orderBy: { order: 'asc' } },
      moduleItem: true,
      inlineItems: { orderBy: { inlineOrder: 'asc' } },
    },
  })
  if (!lesson) return

  // Idempotency: skip if the ModuleItem already points to a Page.
  if (lesson.moduleItem?.pageId) {
    console.log(`  [skip] lesson ${lesson.id} already migrated → page ${lesson.moduleItem.pageId}`)
    return
  }

  await prisma.$transaction(async (tx) => {
    // 1. Create the Page
    const page = await tx.page.create({
      data: {
        moduleId: lesson.moduleId,
        kind: 'LESSON',
        titleEn: lesson.titleEn,
        titleFil: lesson.titleFil,
        bannerUrl: lesson.bannerUrl,
        bannerFileId: lesson.bannerFileId,
        durationSecs: lesson.durationSecs,
        status: lesson.status,
        requiresPrevious: lesson.requiresPrevious,
        order: lesson.order,
      },
    })

    // 2. Attach existing LESSON ModuleItem to the Page and flip its type.
    // Must clear lessonId in the same write — the CHECK constraint enforces exactly one target.
    if (lesson.moduleItem) {
      await tx.moduleItem.update({
        where: { id: lesson.moduleItem.id },
        data: { pageId: page.id, type: ModuleItemType.PAGE, lessonId: null },
      })
    }

    let order = 0
    const nextOrder = () => order++

    // 3. Lesson-level video → VIDEO block
    let lessonVideoBlockId: string | null = null
    if (lesson.youtubeId || lesson.mp4Url) {
      const vb = await tx.contentBlock.create({
        data: {
          pageId: page.id,
          type: BlockType.VIDEO,
          order: nextOrder(),
          youtubeId: lesson.youtubeId,
          mp4Url: lesson.mp4Url,
        },
      })
      lessonVideoBlockId = vb.id
    }

    // 4. Lesson intro body → PARAGRAPH block
    if (lesson.bodyEn || lesson.bodyFil) {
      await tx.contentBlock.create({
        data: {
          pageId: page.id,
          type: BlockType.PARAGRAPH,
          order: nextOrder(),
          textEn: lesson.bodyEn,
          textFil: lesson.bodyFil,
        },
      })
    }

    // 5. Lesson-level materials (no section attachment) → FILE blocks
    for (const m of lesson.materials.filter((m) => !m.lessonSectionId)) {
      await tx.contentBlock.create({
        data: {
          pageId: page.id,
          type: BlockType.FILE,
          order: nextOrder(),
          fileUrl: m.fileUrl,
          fileId: m.fileId,
          fileType: m.fileType,
          fileSizeBytes: m.fileSizeBytes,
          mimeType: m.mimeType,
          originalName: m.originalName,
          captionEn: m.nameEn,
          captionFil: m.nameFil,
        },
      })
    }

    // Build a map: inlineOrder → ModuleItem for interleaving with sections
    const inlineItems = lesson.inlineItems
      .filter((mi) => mi.inlineOrder !== null)
      .sort((a, b) => (a.inlineOrder ?? 0) - (b.inlineOrder ?? 0))

    // 6. For each LessonSection, emit heading + (optional video) + paragraph + image + materials
    for (const s of lesson.sections) {
      // Heading
      await tx.contentBlock.create({
        data: {
          pageId: page.id,
          type: BlockType.HEADING,
          order: nextOrder(),
          headingLevel: 2,
          textEn: s.headingEn,
          textFil: s.headingFil,
        },
      })

      // Section video (respect videoPosition)
      let sectionVideoBlockId: string | null = null
      if ((s.youtubeId || s.mp4Url) && s.videoPosition === 'ABOVE_BODY') {
        const vb = await tx.contentBlock.create({
          data: {
            pageId: page.id,
            type: BlockType.VIDEO,
            order: nextOrder(),
            youtubeId: s.youtubeId,
            mp4Url: s.mp4Url,
          },
        })
        sectionVideoBlockId = vb.id
      }

      if (s.bodyEn || s.bodyFil) {
        await tx.contentBlock.create({
          data: {
            pageId: page.id,
            type: BlockType.PARAGRAPH,
            order: nextOrder(),
            textEn: s.bodyEn,
            textFil: s.bodyFil,
          },
        })
      }

      if ((s.youtubeId || s.mp4Url) && s.videoPosition === 'BELOW_BODY') {
        const vb = await tx.contentBlock.create({
          data: {
            pageId: page.id,
            type: BlockType.VIDEO,
            order: nextOrder(),
            youtubeId: s.youtubeId,
            mp4Url: s.mp4Url,
          },
        })
        sectionVideoBlockId = vb.id
      }

      if (s.imageUrl) {
        await tx.contentBlock.create({
          data: {
            pageId: page.id,
            type: BlockType.IMAGE,
            order: nextOrder(),
            imageUrl: s.imageUrl,
            imageFileId: s.imageFileId,
            altEn: s.imageAltEn,
            altFil: s.imageAltFil,
          },
        })
      }

      for (const m of lesson.materials.filter((m) => m.lessonSectionId === s.id)) {
        await tx.contentBlock.create({
          data: {
            pageId: page.id,
            type: BlockType.FILE,
            order: nextOrder(),
            fileUrl: m.fileUrl,
            fileId: m.fileId,
            fileType: m.fileType,
            fileSizeBytes: m.fileSizeBytes,
            mimeType: m.mimeType,
            originalName: m.originalName,
            captionEn: m.nameEn,
            captionFil: m.nameFil,
          },
        })
      }

      // Move any section-scoped VideoTimestamps to the section's video block
      if (sectionVideoBlockId) {
        await tx.videoTimestamp.updateMany({
          where: { lessonSectionId: s.id, blockId: null },
          data: { blockId: sectionVideoBlockId },
        })
      }
    }

    // 7. Inline tasks / quizzes → TASK_REF / QUIZ_REF blocks
    for (const mi of inlineItems) {
      const blockType =
        mi.type === ModuleItemType.QUIZ ? BlockType.QUIZ_REF :
        mi.type === ModuleItemType.TASK ? BlockType.TASK_REF :
        null
      if (!blockType) continue

      await tx.contentBlock.create({
        data: {
          pageId: page.id,
          type: blockType,
          order: nextOrder(),
          moduleItemId: mi.id,
        },
      })
    }

    // 8. Move lesson-level VideoTimestamps to the lesson's primary video block
    if (lessonVideoBlockId) {
      await tx.videoTimestamp.updateMany({
        where: { lessonId: lesson.id, lessonSectionId: null, blockId: null },
        data: { blockId: lessonVideoBlockId },
      })
    }
  })

  console.log(`  [ok]   lesson ${lesson.id} → page created (${lesson.titleEn})`)
}

async function main() {
  const lessons = await prisma.lesson.findMany({
    where: { deletedAt: null },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })
  console.log(`Migrating ${lessons.length} lessons…`)

  for (const { id } of lessons) {
    try {
      await migrateLesson(id)
    } catch (err) {
      console.error(`  [FAIL] lesson ${id}:`, err)
      throw err
    }
  }

  // Summary counts
  const [pageCount, blockCount] = await Promise.all([
    prisma.page.count(),
    prisma.contentBlock.count(),
  ])
  console.log(`\nDone. Pages: ${pageCount}. Blocks: ${blockCount}.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
