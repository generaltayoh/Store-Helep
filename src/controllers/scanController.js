import { db, nextId } from "../data/store.js";
import { extractRecords } from "../services/ocrService.js";

function serializeScan(scan) {
  return {
    id: scan.id,
    fileName: scan.fileName,
    createdAt: scan.createdAt,
    status: scan.status,
    recordCount: scan.extracted.length,
    extracted: scan.extracted,
    needsReview: scan.extracted.some(
      (r) => r.confidence < 0.6 || r.productName === "Unknown item" || r.unitPrice === 0
    ),
  };
}

// Upload + OCR extract (mock AI). Creates a scan in needs_review.
export async function uploadScan(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded. Send field 'image'." });
  }
  const { extracted, needsReview } = await extractRecords(req.file.buffer, req.file.originalname);

  const scan = {
    id: nextId("scan"),
    fileName: req.file.originalname,
    createdAt: new Date(),
    status: "needs_review",
    extracted,
  };
  db.scans.push(scan);
  res.status(201).json(serializeScan(scan));
}

export function listScans(req, res) {
  const scans = [...db.scans]
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(serializeScan);
  res.json({ scans });
}

export function getScan(req, res) {
  const scan = db.scans.find((s) => s.id === req.params.id);
  if (!scan) return res.status(404).json({ error: "Scan not found." });
  res.json(serializeScan(scan));
}

// Review/edit a single extracted row before confirming.
export function updateExtractedRow(req, res) {
  const scan = db.scans.find((s) => s.id === req.params.id);
  if (!scan) return res.status(404).json({ error: "Scan not found." });
  const row = scan.extracted.find((r) => r.id === req.params.rid);
  if (!row) return res.status(404).json({ error: "Extracted row not found." });

  const { productName, quantity, unitPrice, date } = req.body;
  if (productName !== undefined) row.productName = productName;
  if (quantity !== undefined) row.quantity = Number(quantity);
  if (unitPrice !== undefined) row.unitPrice = Number(unitPrice);
  if (date !== undefined) row.date = new Date(date);
  // Editing clears the low-confidence flag so it can be confirmed.
  if (row.productName !== "Unknown item" && row.unitPrice > 0) {
    row.confidence = Math.max(row.confidence, 0.9);
  }
  res.json(serializeScan(scan));
}

// Commit extracted rows as official business records (source: scanned).
export function confirmScan(req, res) {
  const scan = db.scans.find((s) => s.id === req.params.id);
  if (!scan) return res.status(404).json({ error: "Scan not found." });
  if (scan.status === "saved") {
    return res.status(409).json({ error: "Scan already confirmed." });
  }

  const created = [];
  for (const row of scan.extracted) {
    const record = {
      id: nextId("rec"),
      productId: null,
      productName: row.productName,
      quantity: row.quantity,
      unitPrice: row.unitPrice,
      amount: row.quantity * row.unitPrice,
      timestamp: scan.createdAt || new Date(),
      source: "scanned",
      status: "saved",
      scanId: scan.id,
    };
    db.records.push(record);
    created.push(record);
  }
  scan.status = "saved";
  res.json({ scan: serializeScan(scan), recordsCreated: created.length });
}
