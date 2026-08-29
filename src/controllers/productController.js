import { db } from "../data/store.js";
import {
  listProducts,
  withStatus,
  productStats,
  createProduct,
  findProduct,
} from "../services/inventoryService.js";

export function getProducts(req, res) {
  const { category, stockStatus } = req.query;
  const products = listProducts({ category, stockStatus }).map((p) => ({
    ...p,
    stockValue: p.unitPrice * p.stockQty,
  }));
  res.json({ products, count: products.length });
}

export function getProductStats(req, res) {
  const stats = productStats();
  res.json({ ...stats });
}

export function createProductHandler(req, res) {
  const { sku, name, category, unitPrice, stockQty } = req.body;
  if (!sku || !name || !category || unitPrice === undefined) {
    return res
      .status(400)
      .json({ error: "sku, name, category and unitPrice are required." });
  }
  if (db.products.some((p) => p.sku === sku)) {
    return res.status(409).json({ error: "A product with this SKU already exists." });
  }
  const product = createProduct({ sku, name, category, unitPrice, stockQty: stockQty || 0 });
  db.products.push(product);
  res.status(201).json({ product: withStatus(product) });
}

export function getProduct(req, res) {
  const product = findProduct(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found." });
  res.json({ product: withStatus(product) });
}

export function updateProduct(req, res) {
  const product = findProduct(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found." });
  const { name, category, unitPrice, stockQty } = req.body;
  if (name !== undefined) product.name = name;
  if (category !== undefined) product.category = category;
  if (unitPrice !== undefined) product.unitPrice = Number(unitPrice);
  if (stockQty !== undefined) product.stockQty = Number(stockQty);
  res.json({ product: withStatus(product) });
}

export function restockProduct(req, res) {
  const product = findProduct(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found." });
  const addQty = Number(req.body.addQty);
  if (!Number.isFinite(addQty) || addQty <= 0) {
    return res.status(400).json({ error: "addQty must be a positive number." });
  }
  product.stockQty = (product.stockQty || 0) + addQty;
  res.json({ product: withStatus(product) });
}
