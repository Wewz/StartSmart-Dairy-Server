import { Router } from "express";
import { authenticate, requireAdmin } from "@/middleware/auth.middleware";
import * as inviteCode from "@/controllers/invite-code.controller";

const router = Router();

// Admin: manage codes
router.get("/", authenticate, requireAdmin, inviteCode.listInviteCodes);
router.post("/", authenticate, requireAdmin, inviteCode.createInviteCode);
router.patch("/:id", authenticate, requireAdmin, inviteCode.updateInviteCode);

// Student: redeem a code (preview or confirm)
router.post("/redeem", authenticate, inviteCode.redeemInviteCode);

export default router;
