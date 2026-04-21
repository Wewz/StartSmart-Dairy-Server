import { Router } from "express";
import { authenticate, requireAdmin } from "@/middleware/auth.middleware";
import * as page from "@/controllers/page.controller";
import * as block from "@/controllers/block.controller";

const router = Router();

// Page CRUD (pageId scoped)
router.get("/:pageId", authenticate, page.getPage);
router.patch("/:pageId", authenticate, requireAdmin, page.updatePage);
router.delete("/:pageId", authenticate, requireAdmin, page.deletePage);

// Page progress (student)
router.get("/:pageId/progress", authenticate, page.getPageProgress);
router.post("/:pageId/complete", authenticate, page.completePage);

// Block CRUD scoped by page
router.post("/:pageId/blocks", authenticate, requireAdmin, block.createBlock);
router.post("/:pageId/blocks/reorder", authenticate, requireAdmin, block.reorderBlocks);

// Block-level ops (not page-scoped)
router.patch("/blocks/:blockId", authenticate, requireAdmin, block.updateBlock);
router.delete("/blocks/:blockId", authenticate, requireAdmin, block.deleteBlock);
router.post("/blocks/:blockId/translate", authenticate, requireAdmin, block.translateBlock);

export default router;
