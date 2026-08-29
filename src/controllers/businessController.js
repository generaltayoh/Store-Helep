import { db } from "../data/store.js";
import { normalizeLang } from "../services/currency.js";

export function getBusiness(req, res) {
  if (!db.business) return res.status(404).json({ error: "Business not found." });
  res.json({ business: { ...db.business, settings: { ...db.settings } } });
}

export function updateBusiness(req, res) {
  if (!db.business) return res.status(404).json({ error: "Business not found." });
  const { name, email, type, currency, location, language, darkMode } = req.body;

  if (name !== undefined) db.business.name = name;
  if (email !== undefined) db.business.email = email;
  if (type !== undefined) db.business.type = type;
  if (currency !== undefined) db.business.currency = currency;
  if (location !== undefined) db.business.location = location;
  if (language !== undefined) db.settings.language = normalizeLang(language);
  if (darkMode !== undefined) db.settings.darkMode = Boolean(darkMode);

  res.json({ business: { ...db.business, settings: { ...db.settings } } });
}
