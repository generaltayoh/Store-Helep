import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  listRecords,
  getRecord,
  createRecord,
  updateRecord,
} from "../controllers/recordController.js";

const router = Router();

router.get("/", asyncHandler(listRecords));
router.post("/", asyncHandler(createRecord));
router.get("/:id", asyncHandler(getRecord));
router.patch("/:id", asyncHandler(updateRecord));

export default router;
