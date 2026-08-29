import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { getBusiness, updateBusiness } from "../controllers/businessController.js";

const router = Router();

router.get("/", asyncHandler(getBusiness));
router.patch("/", asyncHandler(updateBusiness));

export default router;
