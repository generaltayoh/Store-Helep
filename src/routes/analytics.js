import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { getAnalytics } from "../controllers/analyticsController.js";

const router = Router();

router.get("/", asyncHandler(getAnalytics));

export default router;
