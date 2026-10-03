import { config } from "../config/index.js";
import { db, nextId } from "../data/store.js";
import { isSupabaseConfigured } from "../config/supabase.js";
import { supabaseService } from "./supabaseService.js";

/*
 * OCR / AI extraction service.
 *
 * This is the single integration seam for turning a record-page photo into
 * structured data. Today it uses a mock extractor so the full
 * scan -> review -> confirm flow is exercisable without an external provider.
 *
 * To integrate a real AI/OCR provider later, implement `callAiProvider`
 * (e.g. POST the image to a vision/LLM endpoint and parse JSON) and set
 * AI_OCR_ENDPOINT / AI_OCR_API_KEY in the environment. The rest of the app
 * is agnostic to where the extraction comes from.
 */

function guessMime(fileName = "") {
  const ext = fileName.split(".").pop().toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "bmp") return "image/bmp";
  return "image/jpeg";
}

const OCR_SYSTEM_PROMPT = `You are an OCR engine for a small-store record-keeping app.
The user records sales using the method: {record_method}.
Given a photo of a handwritten or printed store record / sales page / delivery note,
carefully and slowly read through the entire image. Examine every line, column, and entry.
Only after fully analyzing the image should you produce the structured JSON.

Respond ONLY with a JSON object of the form:
{
  "records": [
    { "productName": string, "quantity": number, "unitPrice": number, "date": "YYYY-MM-DD" },
    ...
  ]
}
Rules:
- productName: the item name as written (keep it short, in the original language).
- quantity: units on that line (default 1 if not written).
- unitPrice: price per unit in the currency shown on the page (number only, no symbols).
- date: the record date if visible, else today's date "YYYY-MM-DD".
- Extract EVERY visible line/item. Do NOT skip items just because handwriting is unclear — read as much as possible and include it.
- Only omit a row if it is completely unreadable; prefer including partial reads over dropping them.
- Do not invent products that are not visible on the page.
- Return an empty records array ONLY if the image has absolutely no readable items.`;

async function callAiProvider(imageBuffer, fileName, recordMethod = "Notebook") {
  if (!config.ai.enabled || !config.ai.endpoint || !config.ai.apiKey) return null;
  const promptWithMethod = OCR_SYSTEM_PROMPT.replace("{record_method}", recordMethod);

  const base64 = imageBuffer.toString("base64");
  const mime = guessMime(fileName);

  // Gemini native API (required for AQ.-prefixed AI Studio keys)
  if (config.ai.provider === "gemini") {
    const body = {
      systemInstruction: { parts: [{ text: promptWithMethod }] },
      contents: [
        {
          parts: [
            { text: "Extract the record rows from this store record image." },
            { inline_data: { mime_type: mime, data: base64 } },
          ],
        },
      ],
      generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
    };
    const res = await fetch(config.ai.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": config.ai.apiKey,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Gemini error: ${res.status} ${detail.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned no content");
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("Gemini returned non-JSON content");
    }
    const rows = parsed.records || parsed.rows || [];
    // Handle Gemini vision format (with box_2d / text_content) as fallback
    if (Array.isArray(rows) && rows.length > 0 && rows[0].box_2d !== undefined && rows[0].text_content !== undefined) {
      return rows.map((r) => ({
        productName: String(r.text_content || "Unknown item"),
        quantity: 1,
        unitPrice: 0,
        confidence: 0.9,
        date: new Date(),
      }));
    }
    return Array.isArray(rows) ? rows : [];
  }

  // OpenAI-compatible vision chat completion
  const body = {
    model: config.ai.model,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: promptWithMethod },
      {
        role: "user",
        content: [
          { type: "text", text: "Extract the record rows from this store record image." },
          { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } },
        ],
      },
    ],
  };
  const res = await fetch(config.ai.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.ai.apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`AI provider error: ${res.status} ${detail.slice(0, 200)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI provider returned no content");
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI provider returned non-JSON content");
  }
  const rows = parsed.records || parsed.rows || [];
  if (Array.isArray(rows) && rows.length > 0 && rows[0].box_2d !== undefined && rows[0].text_content !== undefined) {
    return rows.map((r) => ({
      productName: String(r.text_content || "Unknown item"),
      quantity: 1,
      unitPrice: 0,
      confidence: 0.9,
      date: new Date(),
    }));
  }
  return Array.isArray(rows) ? rows : [];
}

function fuzzyMatch(name, candidates) {
  const n = (name || "").toLowerCase().trim();
  for (const c of candidates) {
    const cn = (c.name || c.productName || "").toLowerCase().trim();
    if (n === cn) return true; // exact
    if (n.includes(cn) || cn.includes(n)) return true; // partial overlap
    // Similarity: split by spaces and check common words
    const words = cn.split(/\s+/);
    for (const w of words) {
      if (w.length > 2 && n.includes(w)) return true;
    }
  }
  return false;
}

export async function extractRecords(imageBuffer, fileName = "upload.jpg", recordMethod = "Notebook") {
  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    const err = new Error("A non-empty image buffer is required.");
    err.status = 400;
    throw err;
  }

  let rows = null;
  try {
    rows = await callAiProvider(imageBuffer, fileName, recordMethod);
  } catch (e) {
    // When AI provider is unavailable, show notification and do not fall back to mock.
    console.warn("[ocrService] AI provider unavailable:", e.message);
    throw new Error("AI provider is currently unavailable. Please try again later.");
  }
  if (!rows || rows.length === 0) {
    throw new Error("No readable records found in the image.");
  }

  // Build product catalog from system (mock DB or Supabase)
  let productCatalog = db.products || [];
  if (isSupabaseConfigured() && supabaseService) {
    try {
      const biz = await supabaseService.getBusiness();
      const bizId = biz?.id;
      if (bizId) {
        const supaProds = await supabaseService.listProducts({ businessId: bizId });
        if (supaProds && supaProds.length > 0) productCatalog = supaProds;
      }
    } catch (e) {
      // Ignore; fall back to db.products
    }
  }

  // Instead of filtering out unrecognised items, we keep them and flag as isUnknown
  const extracted = rows.map((r) => {
    const name = String(r.productName || "Unknown item");
    const isMatched = productCatalog.length === 0 || fuzzyMatch(name, productCatalog);
    return {
      id: nextId("ext"),
      productName: name,
      quantity: Number(r.quantity) > 0 ? Number(r.quantity) : 1,
      unitPrice: Number(r.unitPrice) || 0,
      date: r.date ? new Date(r.date) : new Date(),
      confidence: Number(r.confidence) || 0.9,
      isUnknown: !isMatched,
    };
  });

  return {
    extracted,
    // A scan needs review if any row is low-confidence or unrecognised.
    needsReview: extracted.some(
      (r) => r.confidence < 0.6 || r.productName === "Unknown item" || r.unitPrice === 0 || r.isUnknown
    ),
  };
}
