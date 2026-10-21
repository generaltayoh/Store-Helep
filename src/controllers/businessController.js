import { normalizeLang } from "../services/currency.js";
import { dbService } from "../services/dbService.js";

export async function getBusiness(req, res, next) {
  try {
    const biz = req.business
      ? { id: req.businessId, ...req.business }
      : await dbService.getBusiness(req.businessId);
    if (!biz && req.businessId) {
      const fetched = await dbService.getBusinessById(req.businessId);
      if (!fetched) return res.status(404).json({ error: "Business not found." });
      return res.json({ business: fetched });
    }
    if (!biz) return res.status(404).json({ error: "Business not found." });
    res.json({ business: biz });
  } catch (err) {
    next(err);
  }
}

export async function updateBusiness(req, res, next) {
  try {
    const { name, phone, type, currency, location, language, darkMode } = req.body;

    const biz = await dbService.getBusiness(req.businessId);
    if (!biz) return res.status(404).json({ error: "Business not found." });

    const updated = await dbService.updateBusiness(biz.id, {
      name,
      email: phone,
      type,
      currency: "FCFA",
      location,
      language: language !== undefined ? normalizeLang(language) : undefined,
      darkMode,
    });
    res.json({ business: updated });
  } catch (err) {
    next(err);
  }
}
