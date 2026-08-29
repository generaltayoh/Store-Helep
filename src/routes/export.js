import { Router } from "express";
import { exportRecords, exportProducts } from "../controllers/exportController.js";

const router = Router();

router.get("/records/excel", exportRecords);
router.get("/products/excel", exportProducts);

export default router;
