import { config } from "../config/index.js";

export function stockStatus(stockQty) {
  if (stockQty <= 0) return "out_of_stock";
  if (stockQty <= config.lowStockThreshold) return "low_stock";
  return "in_stock";
}
