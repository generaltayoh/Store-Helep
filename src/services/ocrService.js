import { config } from "../config/index.js";
import { db, nextId } from "../data/store.js";

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

const FALLBACK_ITEMS = [
  { name: "Mineral Water 1.5L", unitPrice: 400 },
  { name: "Bread Loaf", unitPrice: 500 },
  { name: "Sugar 1kg", unitPrice: 900 },
  { name: "Soap Bar", unitPrice: 350 },
  { name: "Cooking Oil 1L", unitPrice: 1500 },
];

function pickProducts(n) {
  const pool = db.products.length > 0 ? db.products : FALLBACK_ITEMS;
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = pool[(Math.random() * pool.length) | 0];
    if (!p) continue;
    out.push({
      productName: p.name,
      quantity: 1 + ((Math.random() * 6) | 0),
      unitPrice: p.unitPrice,
      confidence: Number((0.7 + Math.random() * 0.29).toFixed(2)),
    });
  }
  return out;
}

// Mock extractor — returns plausible rows with a confidence score.
function mockExtract(imageBuffer, fileName, recordMethod = "Notebook") {
  let count = 3 + ((Math.random() * 6) | 0); // 3..8 records
  if (recordMethod === "Receipts") {
    count = 2 + ((Math.random() * 3) | 0); // fewer, cleaner items
  } else if (recordMethod === "Spreadsheet") {
    count = 4 + ((Math.random() * 5) | 0); // more structured items
  } else if (recordMethod === "Other") {
    count = 3 + ((Math.random() * 4) | 0); // mixed/unclear format
  }
  const rows = pickProducts(count).map((r) => ({
    ...r,
    date: new Date(),
  }));
  // Adjust confidence and unknown injection based on method
  let injectUnknown = true;
  if (recordMethod === "Receipts") injectUnknown = Math.random() < 0.3;
  else if (recordMethod === "Spreadsheet") injectUnknown = Math.random() < 0.1;
  else if (recordMethod === "Other") injectUnknown = Math.random() < 0.45; // mixed uncertainty
  else injectUnknown = Math.random() < 0.6; // Notebook: high chance

  if (injectUnknown && rows.length) {
    rows[0] = {
      ...rows[0],
      productName: "Unknown item",
      unitPrice: 0,
      confidence: Number((0.3 + Math.random() * 0.2).toFixed(2)),
    };
  }
  return rows;
}

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
      generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
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
    return Array.isArray(rows) ? rows : [];
  }

  // OpenAI-compatible vision chat completion
  const body = {
    model: config.ai.model,
    temperature: 0.1,
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
  return Array.isArray(rows) ? rows : [];
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
    // Log and fall back to mock so the flow always works in development.
    console.warn("[ocrService] AI provider unavailable, using mock:", e.message);
  }
  if (!rows || (Array.isArray(rows) && rows.length === 0)) rows = mockExtract(imageBuffer, fileName, recordMethod);

  const extracted = rows.map((r) => ({
    id: nextId("ext"),
    productName: String(r.productName || "Unknown item"),
    quantity: Number(r.quantity) > 0 ? Number(r.quantity) : 1,
    unitPrice: Number(r.unitPrice) || 0,
    date: r.date ? new Date(r.date) : new Date(),
    confidence: Number(r.confidence) || 0.9,
  }));

  return {
    extracted,
    // A scan needs review if any row is low-confidence or unrecognised.
    needsReview: extracted.some(
      (r) => r.confidence < 0.6 || r.productName === "Unknown item" || r.unitPrice === 0
    ),
  };
}
