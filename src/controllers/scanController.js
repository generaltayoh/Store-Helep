import { extractRecords } from "../services/ocrService.js";
import { dbService } from "../services/dbService.js";

function serializeScan(scan) {
  const enriched = (scan.extracted || []).map((r) => ({
    ...r,
    isUnknown: r.isUnknown !== undefined ? r.isUnknown : false,
  }));
  return {
    id: scan.id,
    fileName: scan.fileName,
    imageUrl: scan.imageUrl,
    createdAt: scan.createdAt,
    confirmedAt: scan.confirmedAt || null,
    status: scan.status,
    recordCount: scan.extracted ? scan.extracted.length : 0,
    extracted: enriched,
    needsReview:
      scan.status === "needs_review" ||
      enriched.some(
        (r) => r.confidence < 0.6 || r.productName === "Unknown item" || r.unitPrice === 0 || r.isUnknown
      ),
  };
}

// Upload + OCR extract (real AI provider). Creates a scan in needs_review.
export async function uploadScan(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded. Send field 'image'." });
    }

    const biz = await dbService.getBusiness(req.businessId);
    const recordMethod = biz?.recordMethod || "Notebook";
    const { extracted } = await extractRecords(req.file.buffer, req.file.originalname, recordMethod);

    const scan = await dbService.createScan({
      fileName: req.file.originalname,
      extracted,
      businessId: req.businessId,
    });
    res.status(201).json(serializeScan(scan));
  } catch (err) {
    next(err);
  }
}

export async function listScans(req, res, next) {
  try {
    const scans = await dbService.listScans(req.businessId);
    res.json({ scans: scans.map(serializeScan) });
  } catch (err) {
    next(err);
  }
}

export async function getScan(req, res, next) {
  try {
    const scan = await dbService.getScan(req.params.id);
    if (!scan) return res.status(404).json({ error: "Scan not found." });
    res.json(serializeScan(scan));
  } catch (err) {
    next(err);
  }
}

// Review/edit a single extracted row before confirming.
export async function updateExtractedRow(req, res, next) {
  try {
    const { productName, quantity, unitPrice, date } = req.body;

    const scan = await dbService.getScan(req.params.id);
    if (!scan) return res.status(404).json({ error: "Scan not found." });
    const row = scan.extracted.find((r) => r.id === req.params.rid);
    if (!row) return res.status(404).json({ error: "Extracted row not found." });

    const updatedScan = await dbService.updateExtractedRow(req.params.id, req.params.rid, {
      productName,
      quantity: quantity !== undefined ? Number(quantity) : undefined,
      unitPrice: unitPrice !== undefined ? Number(unitPrice) : undefined,
      date,
    });
    res.json(serializeScan(updatedScan));
  } catch (err) {
    next(err);
  }
}

export async function deleteScan(req, res, next) {
  try {
    await dbService.deleteScan(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// Commit extracted rows as official business records (source: scanned).
export async function confirmScan(req, res, next) {
  try {
    const scan = await dbService.getScan(req.params.id);
    if (!scan) return res.status(404).json({ error: "Scan not found." });
    if (scan.status === "saved") {
      return res.status(409).json({ error: "Scan already confirmed." });
    }
    const result = await dbService.confirmScan(req.params.id);
    res.json({
      scan: serializeScan(result.scan),
      recordsCreated: result.recordsCreated,
    });
  } catch (err) {
    next(err);
  }
}
