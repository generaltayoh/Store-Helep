import { db } from "../data/store.js";
import {
  listProducts,
  withStatus,
  productStats,
  createProduct,
  findProduct,
} from "../services/inventoryService.js";
import { isDbConfigured } from "../config/db.js";
import { dbService } from "../services/dbService.js";

export async function getProducts(req, res, next) {
  try {
    const { category, stockStatus } = req.query;

    if (isDbConfigured()) {
      const products = await dbService.listProducts({ category, stockStatus, businessId: req.businessId });
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
    if (isDbConfigured()) {
      const stats = await dbService.getProductStats();
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
    const { name, category, unitPrice, stockQty } = req.body;
    if (!name || !category || unitPrice === undefined) {
      return res
        .status(400)
        .json({ error: "name, category and unitPrice are required." });
    }

    if (isDbConfigured()) {
      const product = await dbService.createProduct({
        name,
        category,
        unitPrice,
        stockQty: stockQty || 0,
      });
      return res.status(201).json({ product });
    }

    const product = createProduct({ name, category, unitPrice, stockQty: stockQty || 0 });
    db.products.push(product);
    res.status(201).json({ product: withStatus(product) });
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req, res, next) {
  try {
    if (isDbConfigured()) {
      const product = await dbService.getProduct(req.params.id);
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

    if (isDbConfigured()) {
      const product = await dbService.getProduct(req.params.id);
      if (!product) return res.status(404).json({ error: "Product not found." });
      const updated = await dbService.updateProduct(req.params.id, {
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

export async function deleteProduct(req, res, next) {
  try {
    if (isDbConfigured()) {
      const product = await dbService.getProduct(req.params.id);
      if (!product) return res.status(404).json({ error: "Product not found." });
      await dbService.deleteProduct(req.params.id);
      return res.status(204).send();
    }
    const idx = db.products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Product not found." });
    db.products.splice(idx, 1);
    return res.status(204).send();
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

    if (isDbConfigured()) {
      const product = await dbService.getProduct(req.params.id);
      if (!product) return res.status(404).json({ error: "Product not found." });
      const updated = await dbService.restockProduct(req.params.id, addQty);
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
