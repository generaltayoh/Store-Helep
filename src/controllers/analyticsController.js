import { formatCurrency } from "../services/currency.js";
import { dbService } from "../services/dbService.js";

export async function getAnalytics(req, res, next) {
  try {
    const { range, from, to, productId, lang } = req.query;
    const data = await dbService.analytics({
      range,
      from,
      to,
      productId,
      businessId: req.businessId,
    });

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
      slowMoving: data.slowMoving.map((p) => {
        // Slow-moving products are not performing well. Never show an upward
        // arrow for them: an increase in a slow item still means it is slow.
        const trend = p.trend === "up" ? "down" : p.trend;
        return {
          ...p,
          trend,
          revenueLabel: formatCurrency(p.revenue, lang),
          trendLabel: trendLabel[trend] || "→",
        };
      }),
    });
  } catch (err) {
    next(err);
  }
}
