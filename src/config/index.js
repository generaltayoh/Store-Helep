import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Minimal .env loader (no dependency) so secrets stay out of the repo and out
// of process.env by default. Only sets vars that are not already defined.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
function loadEnv() {
  const envPath = path.resolve(__dirname, "..", "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadEnv();

const LOW_STOCK_THRESHOLD = 5;
const ESTIMATED_PROFIT_MARGIN = 0.33;

export const config = {
  port: Number(process.env.PORT) || 3000,
  currency: {
    code: process.env.CURRENCY_CODE || "FCFA",
    locale: {
      en: "en-CM",
      fr: "fr-CM",
    },
  },
  lowStockThreshold: Number(process.env.LOW_STOCK_THRESHOLD) || LOW_STOCK_THRESHOLD,
  profitMargin: Number(process.env.PROFIT_MARGIN) || ESTIMATED_PROFIT_MARGIN,
  // Real AI/OCR provider. Supports "gemini" (native API) and "openai"
  // (OpenAI-compatible vision chat completion). Enabled only when
  // OCR_ENABLED=true; otherwise ocrService falls back to mock. The key is read
  // from .env (OCR_API_KEY) and never exposed to the client.
  ai: {
    provider: (process.env.OCR_PROVIDER || "gemini").toLowerCase(),
    model:
      process.env.OCR_MODEL ||
      ((process.env.OCR_PROVIDER || "gemini").toLowerCase() === "openai"
        ? "gpt-4o-mini"
        : "gemini-2.0-flash"),
    endpoint:
      process.env.OCR_BASE_URL ||
      process.env.AI_OCR_ENDPOINT ||
      (((process.env.OCR_PROVIDER || "gemini").toLowerCase() === "openai"
        ? "https://api.openai.com/v1/chat/completions"
        : `https://generativelanguage.googleapis.com/v1beta/models/${
            process.env.OCR_MODEL ||
            ((process.env.OCR_PROVIDER || "gemini").toLowerCase() === "openai"
              ? "gpt-4o-mini"
              : "gemini-2.0-flash")
          }:generateContent`)),
    enabled: process.env.OCR_ENABLED === "true",
    apiKey: process.env.OCR_API_KEY || process.env.AI_OCR_API_KEY || null,
  },
  supabase: {
    url: process.env.SUPABASE_URL || null,
    anonKey: process.env.SUPABASE_ANON_KEY || null,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || null,
  },
};
