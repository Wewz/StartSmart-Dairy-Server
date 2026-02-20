import { Router } from "express";
import * as auth from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", auth.register);
router.post("/login", auth.login);
router.post("/verify-otp", auth.verifyOtp);
router.post("/forgot-password", auth.forgotPassword);
router.post("/reset-password", auth.resetPassword);
router.get("/me", authenticate, auth.getMe);
router.patch("/me", authenticate, auth.updateProfile);

export default router;