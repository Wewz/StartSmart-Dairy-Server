import { Router } from "express";
import * as course from "../controllers/course.controller";
import { authenticate, requireAdmin, requireInstructor } from "../middleware/auth.middleware";

const router = Router();

// Enrollment
router.post("/enroll", authenticate, course.enrollWithCode);

// Courses
router.get("/", authenticate, course.listCourses);
router.get("/:slug", authenticate, course.getCourse);
router.post("/", authenticate, requireInstructor, course.createCourse);
router.patch("/:id", authenticate, requireInstructor, course.updateCourse);
router.delete("/:id", authenticate, requireAdmin, course.deleteCourse);

// Invite codes
router.get("/:courseId/invite-codes", authenticate, requireInstructor, course.listInviteCodes);
router.post("/invite-codes", authenticate, requireInstructor, course.createInviteCode);

export default router;