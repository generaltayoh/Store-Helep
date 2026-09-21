import { db } from "../data/store.js";
import {
  listProducts,
  withStatus,
  productStats,
  createProduct,
  findProduct,
} from "../services/inventoryService.js";
import { isSupabaseConfigured } from "../config/supabase.js";
import { supabaseService } from "../services/supabaseService.js";

export async function getProducts(req, res, next) {
  try {
    const { category, stockStatus } = req.query;

    if (isSupabaseConfigured()) {
      const products = await supabaseService.listProducts({ category, stockStatus });
      return res.json({ products, count: products.length });
    }

    const products = listProducts({ category, stockStatus }).map((p) => ({
      ...p,
      stockValue: p.unitPrice * p.stockQty,
    }));
    res.json({ products, count: products.length });
  } catch (err) {
    next(err);
  }
}

export async function getProductStats(req, res, next) {
  try {
    if (isSupabaseConfigured()) {
      const stats = await supabaseService.getProductStats();
      return res.json({ ...stats });
    }

    const stats = productStats();
    res.json({ ...stats });
  } catch (err) {
    next(err);
  }
}

export async function createProductHandler(req, res, next) {
  try {
    const { sku, name, category, unitPrice, stockQty } = req.body;
    if (!sku || !name || !category || unitPrice === undefined) {
      return res
        .status(400)
        .json({ error: "sku, name, category and unitPrice are required." });
    }

    if (isSupabaseConfigured()) {
      const existing = await supabaseService.listProducts();
      if (existing.some((p) => p.sku === sku)) {
        return res.status(409).json({ error: "A product with this SKU already exists." });
      }
      const product = await supabaseService.createProduct({
        sku,
        name,
        category,
        unitPrice,
        stockQty: stockQty || 0,
      });
      return res.status(201).json({ product });
    }

    if (db.products.some((p) => p.sku === sku)) {
      return res.status(409).json({ error: "A product with this SKU already exists." });
    }
    const product = createProduct({ sku, name, category, unitPrice, stockQty: stockQty || 0 });
    db.products.push(product);
    res.status(201).json({ product: withStatus(product) });
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req, res, next) {
  try {
    if (isSupabaseConfigured()) {
      const product = await supabaseService.getProduct(req.params.id);
      if (!product) return res.status(404).json({ error: "Product not found." });
      return res.json({ product });
    }

    const product = findProduct(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found." });
    res.json({ product: withStatus(product) });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const { name, category, unitPrice, stockQty } = req.body;

    if (isSupabaseConfigured()) {
      const product = await supabaseService.getProduct(req.params.id);
      if (!product) return res.status(404).json({ error: "Product not found." });
      const updated = await supabaseService.updateProduct(req.params.id, {
        name,
        category,
        unitPrice,
        stockQty,
      });
      return res.json({ product: updated });
    }

    const product = findProduct(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found." });
    if (name !== undefined) product.name = name;
    if (category !== undefined) product.category = category;
    if (unitPrice !== undefined) product.unitPrice = Number(unitPrice);
    if (stockQty !== undefined) product.stockQty = Number(stockQty);
    res.json({ product: withStatus(product) });
  } catch (err) {
    next(err);
  }
}

export async function restockProduct(req, res, next) {
  try {
    const addQty = Number(req.body.addQty);
    if (!Number.isFinite(addQty) || addQty <= 0) {
      return res.status(400).json({ error: "addQty must be a positive number." });
    }

    if (isSupabaseConfigured()) {
      const product = await supabaseService.getProduct(req.params.id);
      if (!product) return res.status(404).json({ error: "Product not found." });
      const updated = await supabaseService.restockProduct(req.params.id, addQty);
      return res.json({ product: updated });
    }

    const product = findProduct(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found." });
    product.stockQty = (product.stockQty || 0) + addQty;
    res.json({ product: withStatus(product) });
  } catch (err) {
    next(err);
  }
}
