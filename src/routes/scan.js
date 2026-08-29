import { Router } from "express";
import multer from "multer";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  uploadScan,
  listScans,
  getScan,
  updateExtractedRow,
  confirmScan,
} from "../controllers/scanController.js";

const router = Router();

// Memory storage: the image buffer is used for OCR then discarded (privacy NFR).
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

router.post("/", upload.single("image"), asyncHandler(uploadScan));
router.get("/", asyncHandler(listScans));
router.get("/:id", asyncHandler(getScan));
router.patch("/:id/records/:rid", asyncHandler(updateExtractedRow));
router.post("/:id/confirm", asyncHandler(confirmScan));

export default router;
