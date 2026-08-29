import { dashboard } from "../services/analyticsService.js";
import { formatCurrency, statusLabel } from "../services/currency.js";

export function getDashboard(req, res) {
  const data = dashboard();
  const lang = req.query.lang;
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
}
