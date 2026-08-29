import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { login, setup, setRecordMethod } from "../controllers/authController.js";

const router = Router();

router.post("/login", asyncHandler(login));
router.post("/setup", asyncHandler(setup));
router.post("/record-method", asyncHandler(setRecordMethod));

export default router;
