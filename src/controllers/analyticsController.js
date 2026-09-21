import { analytics } from "../services/analyticsService.js";
import { formatCurrency } from "../services/currency.js";
import { isSupabaseConfigured } from "../config/supabase.js";
import { supabaseService } from "../services/supabaseService.js";

export async function getAnalytics(req, res, next) {
  try {
    const { range, from, to, productId, lang } = req.query;
    let data;

    if (isSupabaseConfigured()) {
      data = await supabaseService.analytics({ range, from, to, productId });
    } else {
      data = analytics({ range, from, to, productId });
    }

    const trendLabel = { up: "↑", down: "↓", steady: "→" };

    res.json({
      range: data.range,
      metrics: {
        totalSales: data.totalSales,
        totalSalesLabel: formatCurrency(data.totalSales, lang),
        numberOfSales: data.numberOfSales,
        avgTransaction: data.avgTransaction,
        avgTransactionLabel: formatCurrency(data.avgTransaction, lang),
        estimatedProfit: data.estimatedProfit,
        estimatedProfitLabel: formatCurrency(data.estimatedProfit, lang),
      },
      weeklyChart: data.weeklyChart.map((c) => ({
        ...c,
        valueLabel: formatCurrency(c.value, lang),
      })),
      bestSelling: data.bestSelling.map((p) => ({
        ...p,
        revenueLabel: formatCurrency(p.revenue, lang),
        trendLabel: trendLabel[p.trend] || "→",
      })),
      slowMoving: data.slowMoving.map((p) => ({
        ...p,
        revenueLabel: formatCurrency(p.revenue, lang),
        trendLabel: trendLabel[p.trend] || "→",
      })),
    });
  } catch (err) {
    next(err);
  }
}
