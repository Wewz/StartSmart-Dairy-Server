import { Router } from "express";
import * as course from "@/controllers/course.controller";
import { authenticate, requireAdmin } from "@/middleware/auth.middleware";
import { validateRequest } from "@/middleware/validate.middleware";
import {
  createLessonSchema,
  updateLessonSchema,
} from "@/validation/lesson.validation";
import * as lessonContent from "@/controllers/lesson-content.controller";
import {
  createLessonSectionSchema,
  reorderLessonSectionsSchema,
  transcriptLanguageParamSchema,
  updateLessonSectionSchema,
  upsertTranscriptSchema,
} from "@/validation/lesson-content.validation";

const router = Router();

router.get("/:id", authenticate, course.getLesson);
router.post(
  "/",
  authenticate,
  requireAdmin,
  validateRequest({ body: createLessonSchema }),
  course.createLesson,
);
router.patch(
  "/:id",
  authenticate,
  requireAdmin,
  validateRequest({ body: updateLessonSchema }),
  course.updateLesson,
);
router.patch("/:id/restore", authenticate, requireAdmin, course.restoreLesson);
router.delete("/:id", authenticate, requireAdmin, course.deleteLesson);

// Lesson sections
router.get("/:lessonId/sections", authenticate, lessonContent.listSections);
router.post(
  "/:lessonId/sections",
  authenticate,
  requireAdmin,
  validateRequest({ body: createLessonSectionSchema }),
  lessonContent.createSection,
);
router.patch(
  "/sections/:sectionId",
  authenticate,
  requireAdmin,
  validateRequest({ body: updateLessonSectionSchema }),
  lessonContent.updateSection,
);
router.delete(
  "/sections/:sectionId",
  authenticate,
  requireAdmin,
  lessonContent.deleteSection,
);
router.patch(
  "/:lessonId/sections/reorder",
  authenticate,
  requireAdmin,
  validateRequest({ body: reorderLessonSectionsSchema }),
  lessonContent.reorderSections,
);

// Video transcripts
router.get(
  "/:lessonId/transcripts",
  authenticate,
  lessonContent.listTranscripts,
);
router.put(
  "/:lessonId/transcripts/:language",
  authenticate,
  requireAdmin,
  validateRequest({ params: transcriptLanguageParamSchema }),
  validateRequest({ body: upsertTranscriptSchema }),
  lessonContent.upsertTranscript,
);
router.delete(
  "/transcripts/:transcriptId",
  authenticate,
  requireAdmin,
  lessonContent.deleteTranscript,
);

export default router;
