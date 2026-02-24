import { Router } from "express";
import * as course from "@/controllers/course.controller";
import { authenticate, requireAdmin } from "@/middleware/auth.middleware";

const router = Router();

// Enrollment
router.post("/enroll", authenticate, course.enrollWithCode);
router.post("/admin-enroll", authenticate, requireAdmin, course.adminEnrollUser);

// Courses
router.get("/", authenticate, course.listCourses);
router.get("/:slug", authenticate, course.getCourse);
router.post("/", authenticate, requireAdmin, course.createCourse);
router.patch("/:id", authenticate, requireAdmin, course.updateCourse);
router.delete("/:id", authenticate, requireAdmin, course.deleteCourse);

// Modules within a course
router.get("/:courseId/modules", authenticate, course.listModules);

// Invite codes
router.get("/:courseId/invite-codes", authenticate, requireAdmin, course.listInviteCodes);
router.post("/invite-codes", authenticate, requireAdmin, course.createInviteCode);

export default router;
