import { db } from "../data/store.js";
import { normalizeLang } from "../services/currency.js";
import { isSupabaseConfigured } from "../config/supabase.js";
import { supabaseService } from "../services/supabaseService.js";

export async function getBusiness(req, res, next) {
  try {
    if (isSupabaseConfigured()) {
      const biz = await supabaseService.getBusiness();
      if (!biz) return res.status(404).json({ error: "Business not found." });
      return res.json({ business: biz });
    }

    if (!db.business) return res.status(404).json({ error: "Business not found." });
    res.json({ business: { ...db.business, settings: { ...db.settings } } });
  } catch (err) {
    next(err);
  }
}

export async function updateBusiness(req, res, next) {
  try {
    const { name, phone, type, currency, location, language, darkMode } = req.body;

    if (isSupabaseConfigured()) {
      let biz = await supabaseService.getBusiness();
      if (!biz) return res.status(404).json({ error: "Business not found." });

      const updated = await supabaseService.updateBusiness(biz.id, {
        name,
        email: phone,
        type,
        currency,
        location,
        language: language !== undefined ? normalizeLang(language) : undefined,
        darkMode,
      });
      return res.json({ business: updated });
    }

    if (!db.business) return res.status(404).json({ error: "Business not found." });

    if (name !== undefined) db.business.name = name;
    if (phone !== undefined) db.business.email = phone;
    if (type !== undefined) db.business.type = type;
    if (currency !== undefined) db.business.currency = currency;
    if (location !== undefined) db.business.location = location;
    if (language !== undefined) db.settings.language = normalizeLang(language);
    if (darkMode !== undefined) db.settings.darkMode = Boolean(darkMode);

    res.json({ business: { ...db.business, settings: { ...db.settings } } });
  } catch (err) {
    next(err);
  }
}
