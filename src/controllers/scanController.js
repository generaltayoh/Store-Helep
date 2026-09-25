import { db, nextId } from "../data/store.js";
import { extractRecords } from "../services/ocrService.js";
import { isSupabaseConfigured } from "../config/supabase.js";
import { supabaseService } from "../services/supabaseService.js";

function serializeScan(scan) {
  return {
    id: scan.id,
    fileName: scan.fileName,
    imageUrl: scan.imageUrl,
    createdAt: scan.createdAt,
    status: scan.status,
    recordCount: scan.extracted.length,
    extracted: scan.extracted,
    needsReview:
      scan.status === "needs_review" ||
      scan.extracted.some(
        (r) => r.confidence < 0.6 || r.productName === "Unknown item" || r.unitPrice === 0
      ),
  };
}

// Upload + OCR extract (mock AI or real Gemini). Creates a scan in needs_review.
export async function uploadScan(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded. Send field 'image'." });
    }
    let recordMethod = "Notebook";
    if (isSupabaseConfigured()) {
      const biz = await supabaseService.getBusiness();
      recordMethod = biz?.recordMethod || "Notebook";
    }
    const { extracted } = await extractRecords(req.file.buffer, req.file.originalname, recordMethod);

    if (isSupabaseConfigured()) {
      const scan = await supabaseService.createScan({
        fileName: req.file.originalname,
        extracted,
      });
      return res.status(201).json(serializeScan(scan));
    }

    const scan = {
      id: nextId("scan"),
      fileName: req.file.originalname,
      createdAt: new Date(),
      status: "needs_review",
      extracted,
    };
    db.scans.push(scan);
    res.status(201).json(serializeScan(scan));
  } catch (err) {
    next(err);
  }
}

export async function listScans(req, res, next) {
  try {
    if (isSupabaseConfigured()) {
      const scans = await supabaseService.listScans();
      return res.json({ scans: scans.map(serializeScan) });
    }

    const scans = [...db.scans]
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(serializeScan);
    res.json({ scans });
  } catch (err) {
    next(err);
  }
}

export async function getScan(req, res, next) {
  try {
    if (isSupabaseConfigured()) {
      const scan = await supabaseService.getScan(req.params.id);
      if (!scan) return res.status(404).json({ error: "Scan not found." });
      return res.json(serializeScan(scan));
    }

    const scan = db.scans.find((s) => s.id === req.params.id);
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

    if (isSupabaseConfigured()) {
      const scan = await supabaseService.getScan(req.params.id);
      if (!scan) return res.status(404).json({ error: "Scan not found." });
      const row = scan.extracted.find((r) => r.id === req.params.rid);
      if (!row) return res.status(404).json({ error: "Extracted row not found." });

      const updatedScan = await supabaseService.updateExtractedRow(
        req.params.id,
        req.params.rid,
        {
          productName,
          quantity: quantity !== undefined ? Number(quantity) : undefined,
          unitPrice: unitPrice !== undefined ? Number(unitPrice) : undefined,
          date,
        }
      );
      return res.json(serializeScan(updatedScan));
    }

    const scan = db.scans.find((s) => s.id === req.params.id);
    if (!scan) return res.status(404).json({ error: "Scan not found." });
    const row = scan.extracted.find((r) => r.id === req.params.rid);
    if (!row) return res.status(404).json({ error: "Extracted row not found." });

    if (productName !== undefined) row.productName = productName;
    if (quantity !== undefined) row.quantity = Number(quantity);
    if (unitPrice !== undefined) row.unitPrice = Number(unitPrice);
    if (date !== undefined) row.date = new Date(date);
    // Editing clears the low-confidence flag so it can be confirmed.
    if (row.productName !== "Unknown item" && row.unitPrice > 0) {
      row.confidence = Math.max(row.confidence, 0.9);
    }
    res.json(serializeScan(scan));
  } catch (err) {
    next(err);
  }
}

export async function deleteScan(req, res, next) {
  try {
    if (isSupabaseConfigured()) {
      const supabase = require("../config/supabase.js").getSupabaseClient();
      if (supabase) {
        const { error: delErr } = await supabase.from("scans").delete().eq("id", req.params.id);
        if (delErr) throw delErr;
        return res.status(204).send();
      }
      return res.status(404).json({ error: "Scan not found or Supabase not configured." });
    }
    const idx = db.scans.findIndex((s) => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Scan not found." });
    db.scans.splice(idx, 1);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// Commit extracted rows as official business records (source: scanned).
export async function confirmScan(req, res, next) {
  try {
    if (isSupabaseConfigured()) {
      const scan = await supabaseService.getScan(req.params.id);
      if (!scan) return res.status(404).json({ error: "Scan not found." });
      if (scan.status === "saved") {
        return res.status(409).json({ error: "Scan already confirmed." });
      }
      const result = await supabaseService.confirmScan(req.params.id);
      return res.json({
        scan: serializeScan(result.scan),
        recordsCreated: result.recordsCreated,
      });
    }

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
  } catch (err) {
    next(err);
  }
}
