import { db, nextId } from "../data/store.js";
import { resolveRange } from "../services/analyticsService.js";

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

function filterRecords(filter, from, to) {
  switch (filter) {
    case "needs_review":
      return db.records.filter((r) => r.status === "needs_review");
    case "today":
    case "this_week":
    case "this_month":
    case "custom": {
      const { from: f, to: t } = resolveRange(filter, from, to);
      return db.records.filter((r) => r.timestamp >= f && r.timestamp <= t);
    }
    default:
      return [...db.records];
  }
}

export function listRecords(req, res) {
  const { filter = "all", from, to } = req.query;
  let records = filterRecords(filter, from, to);
  records.sort((a, b) => b.timestamp - a.timestamp);

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
      amount: r.amount,
      timestamp: r.timestamp,
      time: new Date(r.timestamp).toLocaleTimeString("en-CM", {
        hour: "numeric",
        minute: "2-digit",
      }),
      source: r.source,
      status: r.status,
    });
  }

  const grouped = [...groups.entries()].map(([label, items]) => ({ label, items }));
  res.json({ filter, count: records.length, groups: grouped });
}

export function getRecord(req, res) {
  const record = db.records.find((r) => r.id === req.params.id);
  if (!record) return res.status(404).json({ error: "Record not found." });
  res.json({ record });
}

// Manual record entry.
export function createRecord(req, res) {
  const { productId, productName, quantity, unitPrice, timestamp, status } = req.body;
  if (!productName || !quantity || unitPrice === undefined) {
    return res
      .status(400)
      .json({ error: "productName, quantity and unitPrice are required." });
  }
  const record = {
    id: nextId("rec"),
    productId: productId || null,
    productName,
    quantity: Number(quantity),
    unitPrice: Number(unitPrice),
    amount: Number(quantity) * Number(unitPrice),
    timestamp: timestamp ? new Date(timestamp) : new Date(),
    source: "manual",
    status: status === "needs_review" ? "needs_review" : "saved",
    scanId: null,
  };
  db.records.push(record);
  res.status(201).json({ record });
}

export function updateRecord(req, res) {
  const record = db.records.find((r) => r.id === req.params.id);
  if (!record) return res.status(404).json({ error: "Record not found." });
  const { productName, quantity, unitPrice, status } = req.body;
  if (productName !== undefined) record.productName = productName;
  if (quantity !== undefined) {
    record.quantity = Number(quantity);
    record.amount = record.quantity * record.unitPrice;
  }
  if (unitPrice !== undefined) {
    record.unitPrice = Number(unitPrice);
    record.amount = record.quantity * record.unitPrice;
  }
  if (status !== undefined) record.status = status;
  res.json({ record });
}
