import { formatCurrency, statusLabel } from "../services/currency.js";
import { dbService } from "../services/dbService.js";

export async function getDashboard(req, res, next) {
  try {
    const lang = req.query.lang;
    const data = await dbService.dashboard(req.businessId);

    res.json({
      ...data,
      // Localized, display-ready strings for the home screen.
      salesTodayLabel: formatCurrency(data.salesToday, lang),
      estimatedProfitLabel: formatCurrency(data.estimatedProfit, lang),
      attentionLabels: data.attention.map((a) => ({
        ...a,
        typeLabel: statusLabel(a.type, lang),
      })),
    });
  } catch (err) {
    next(err);
  }
}
