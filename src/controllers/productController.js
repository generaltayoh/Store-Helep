import { dbService } from "../services/dbService.js";

// Cost price is optional. Returns undefined when absent, null when invalid.
function parseCostPrice(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export async function getProducts(req, res, next) {
  try {
    const { category, stockStatus } = req.query;
    const products = await dbService.listProducts({
      category,
      stockStatus,
      businessId: req.businessId,
    });
    res.json({ products, count: products.length });
  } catch (err) {
    next(err);
  }
}

export async function getProductStats(req, res, next) {
  try {
    const stats = await dbService.getProductStats(req.businessId);
    res.json({ ...stats });
  } catch (err) {
    next(err);
  }
}

export async function createProductHandler(req, res, next) {
  try {
    // Only the cost price is entered by hand. The selling price is learned
    // from the scans, never typed in.
    const { name, category, costPrice, stockQty } = req.body;
    if (!name || !category) {
      return res.status(400).json({ error: "name and category are required." });
    }

    const cost = parseCostPrice(costPrice);
    if (cost === null) {
      return res.status(400).json({ error: "costPrice must be zero or more." });
    }

    const product = await dbService.createProduct({
      name,
      category,
      costPrice: cost || 0,
      stockQty: stockQty || 0,
      businessId: req.businessId,
    });
    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req, res, next) {
  try {
    const product = await dbService.getProduct(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found." });
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req, res, next) {
  try {
    // Only the cost price is editable by hand; the selling price comes from
    // the scans.
    const { name, category, costPrice, stockQty } = req.body;

    const cost = parseCostPrice(costPrice);
    if (cost === null) {
      return res.status(400).json({ error: "costPrice must be zero or more." });
    }

    const product = await dbService.getProduct(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found." });

    const updated = await dbService.updateProduct(req.params.id, {
      name,
      category,
      costPrice: cost,
      stockQty,
    });
    res.json({ product: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const product = await dbService.getProduct(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found." });
    await dbService.deleteProduct(req.params.id);
    res.status(204).send();
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

    const product = await dbService.getProduct(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found." });
    const updated = await dbService.restockProduct(req.params.id, addQty);
    res.json({ product: updated });
  } catch (err) {
    next(err);
  }
}
