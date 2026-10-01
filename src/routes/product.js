import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  getProducts,
  getProductStats,
  createProductHandler,
  getProduct,
  updateProduct,
  restockProduct,
  deleteProduct,
} from "../controllers/productController.js";

const router = Router();

router.get("/stats", asyncHandler(getProductStats));
router.get("/", asyncHandler(getProducts));
router.post("/", asyncHandler(createProductHandler));
router.get("/:id", asyncHandler(getProduct));
router.patch("/:id", asyncHandler(updateProduct));
router.post("/:id/restock", asyncHandler(restockProduct));
router.delete("/:id", asyncHandler(deleteProduct));

export default router;
