import { recordProfit } from "../services/profitService.js";
import { dbService } from "../services/dbService.js";

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayLabel(ts) {
  const today = startOfDay(Date.now()).getTime();
  const that = startOfDay(ts).getTime();
  if (that === today) return "Today";
  if (that === today - 24 * 60 * 60 * 1000) return "Yesterday";
  return new Date(ts).toLocaleDateString("en-CM", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export async function listRecords(req, res, next) {
  try {
    const { filter = "all", from, to } = req.query;

    const records = await dbService.listRecords({
      filter,
      from,
      to,
      businessId: req.businessId,
    });

    // Group by calendar day.
    const groups = new Map();
    for (const r of records) {
      const label = dayLabel(r.timestamp);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push({
        id: r.id,
        productName: r.productName,
        quantity: r.quantity,
        unitPrice: r.unitPrice,
        costPrice: r.costPrice || 0,
        profit: recordProfit(r),
        amount: r.amount,
        timestamp: r.timestamp,
        time: new Date(r.timestamp).toLocaleTimeString("en-CM", {
          hour: "numeric",
          minute: "2-digit",
        }),
        source: r.source,
        status: r.status,
        scanId: r.scanId,
      });
    }

    const grouped = [...groups.entries()].map(([label, items]) => ({ label, items }));
    res.json({ filter, count: records.length, groups: grouped });
  } catch (err) {
    next(err);
  }
}

export async function getRecord(req, res, next) {
  try {
    const record = await dbService.getRecord(req.params.id);
    if (!record || record.businessId !== req.businessId) {
      return res.status(404).json({ error: "Record not found." });
    }
    res.json({ record });
  } catch (err) {
    next(err);
  }
}

// Manual record entry.
export async function createRecord(req, res, next) {
  try {
    const { productId, productName, quantity, unitPrice, costPrice, timestamp, status } = req.body;
    if (!productName || !quantity || unitPrice === undefined) {
      return res
        .status(400)
        .json({ error: "productName, quantity and unitPrice are required." });
    }
    if (costPrice !== undefined && costPrice !== null && Number(costPrice) < 0) {
      return res.status(400).json({ error: "costPrice must be zero or more." });
    }

    if (productId) {
      const product = await dbService.getProduct(productId);
      if (!product || product.businessId !== req.businessId) {
        return res.status(404).json({ error: "Product not found." });
      }
    }

    const record = await dbService.createRecord({
      productId,
      productName,
      quantity: Number(quantity),
      unitPrice: Number(unitPrice),
      costPrice,
      timestamp,
      source: "manual",
      status: status === "needs_review" ? "needs_review" : "saved",
      businessId: req.businessId,
    });
    res.status(201).json({ record });
  } catch (err) {
    next(err);
  }
}

export async function updateRecord(req, res, next) {
  try {
    const { productName, quantity, unitPrice, costPrice, status } = req.body;

    const existing = await dbService.getRecord(req.params.id);
    if (!existing || existing.businessId !== req.businessId) {
      return res.status(404).json({ error: "Record not found." });
    }

    const updated = await dbService.updateRecord(req.params.id, {
      productName,
      quantity,
      unitPrice,
      costPrice,
      status,
    });
    res.json({ record: updated });
  } catch (err) {
    next(err);
  }
}
