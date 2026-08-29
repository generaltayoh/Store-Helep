import { config } from "../config/index.js";

const SUPPORTED = ["en", "fr"];

export function normalizeLang(lang) {
  return SUPPORTED.includes(lang) ? lang : "en";
}

// Format an amount in the store currency (FCFA). FCFA has no minor units,
// so we always round to whole numbers and group thousands.
export function formatCurrency(amount, lang = "en") {
  const value = Math.round(Number(amount) || 0);
  const locale = config.currency.locale[normalizeLang(lang)] || "en-CM";
  const grouped = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(value);
  return `${config.currency.code} ${grouped}`;
}

// Localized number formatting (no currency symbol).
export function formatNumber(value, lang = "en") {
  const locale = config.currency.locale[normalizeLang(lang)] || "en-CM";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
    Number(value) || 0
  );
}

// Human-readable status labels per language (consistency with frontend wording).
const STATUS_LABELS = {
  en: {
    in_stock: "In stock",
    low_stock: "Low stock",
    out_of_stock: "Out of stock",
    saved: "Saved",
    needs_review: "Needs review",
    scanned: "Scanned",
    manual: "Manual",
  },
  fr: {
    in_stock: "En stock",
    low_stock: "Stock faible",
    out_of_stock: "Rupture de stock",
    saved: "Enregistré",
    needs_review: "À vérifier",
    scanned: "Scanné",
    manual: "Manuel",
  },
};

export function statusLabel(status, lang = "en") {
  return (STATUS_LABELS[normalizeLang(lang)] || STATUS_LABELS.en)[status] || status;
}
