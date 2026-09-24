import { dashboard } from "../services/analyticsService.js";
import { formatCurrency, statusLabel } from "../services/currency.js";
import { isSupabaseConfigured } from "../config/supabase.js";
import { supabaseService } from "../services/supabaseService.js";

export async function getDashboard(req, res, next) {
  try {
    const lang = req.query.lang;
    let data;

    if (isSupabaseConfigured()) {
      data = await supabaseService.dashboard(req.businessId);
    } else {
      data = dashboard();
    }

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
