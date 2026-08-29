import { db, nextId } from "../data/store.js";
import { config } from "../config/index.js";

export function stockStatus(stockQty) {
  if (stockQty <= 0) return "out_of_stock";
  if (stockQty <= config.lowStockThreshold) return "low_stock";
  return "in_stock";
}

export function findProduct(id) {
  return db.products.find((p) => p.id === id) || null;
}

export function listProducts({ category, stockStatus } = {}) {
  return db.products
    .filter((p) => (category ? p.category === category : true))
    .filter((p) =>
      stockStatus && stockStatus !== "all" ? stockStatus === stockStatusFor(p) : true
    )
    .map((p) => withStatus(p));
}

function stockStatusFor(p) {
  return stockStatus(p.stockQty);
}

export function withStatus(p) {
  return { ...p, stockStatus: stockStatusFor(p) };
}

export function productStats() {
  let totalStockValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  for (const p of db.products) {
    totalStockValue += p.unitPrice * p.stockQty;
    const s = stockStatusFor(p);
    if (s === "low_stock") lowStockCount++;
    if (s === "out_of_stock") outOfStockCount++;
  }
  return {
    totalProducts: db.products.length,
    totalStockValue,
    lowStockCount,
    outOfStockCount,
  };
}

export function createProduct({ sku, name, category, unitPrice, stockQty = 0 }) {
  const product = {
    id: nextId("prod"),
    sku,
    name,
    category,
    unitPrice: Number(unitPrice),
    stockQty: Number(stockQty),
  };
  return product;
}
