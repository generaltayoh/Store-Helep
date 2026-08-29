import { db } from "../data/store.js";
import { config } from "../config/index.js";
import { productStats } from "./inventoryService.js";

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Resolve a range filter into absolute [from, to] timestamps.
export function resolveRange(range, from, to) {
  const now = Date.now();
  switch (range) {
    case "today":
      return { from: startOfDay(now).getTime(), to: now };
    case "7d":
    case "this_week":
      return { from: now - 7 * DAY, to: now };
    case "30d":
    case "this_month":
      return { from: now - 30 * DAY, to: now };
    case "custom":
      return {
        from: from ? new Date(from).getTime() : now - 30 * DAY,
        to: to ? new Date(to).getTime() : now,
      };
    default:
      return { from: now - 30 * DAY, to: now };
  }
}

function recordsBetween(from, to) {
  return db.records.filter(
    (r) => r.timestamp >= from && r.timestamp <= to && r.status === "saved"
  );
}

function salesOf(records) {
  return records.reduce((s, r) => s + (r.amount || 0), 0);
}

function unitsOf(records) {
  return records.reduce((s, r) => s + (r.quantity || 0), 0);
}

export function dashboard() {
  const now = Date.now();
  const todayStart = startOfDay(now).getTime();
  const yesterdayStart = todayStart - DAY;

  const todayRecords = db.records.filter(
    (r) => r.timestamp >= todayStart && r.status === "saved"
  );
  const yesterdayRecords = db.records.filter(
    (r) => r.timestamp >= yesterdayStart && r.timestamp < todayStart && r.status === "saved"
  );

  const salesToday = salesOf(todayRecords);
  const salesYesterday = salesOf(yesterdayRecords);
  const salesDeltaPct =
    salesYesterday > 0 ? Math.round(((salesToday - salesYesterday) / salesYesterday) * 100) : 0;

  const stats = productStats();

  const attention = [];
  if (stats.lowStockCount > 0) {
    attention.push({
      type: "low_stock",
      message: `${stats.lowStockCount} products are low in stock`,
    });
  }
  if (stats.outOfStockCount > 0) {
    attention.push({
      type: "out_of_stock",
      message: `${stats.outOfStockCount} products are out of stock`,
    });
  }

  return {
    salesToday,
    salesDeltaPct,
    transactionsToday: todayRecords.length,
    estimatedProfit: Math.round(salesToday * config.profitMargin),
    unitsSold: unitsOf(todayRecords),
    lowStockCount: stats.lowStockCount,
    outOfStockCount: stats.outOfStockCount,
    attention,
  };
}

function trend(current, previous) {
  if (previous === 0 && current === 0) return "steady";
  if (previous === 0) return "up";
  const pct = ((current - previous) / previous) * 100;
  if (pct > 5) return "up";
  if (pct < -5) return "down";
  return "steady";
}

export function analytics({ range = "30d", from, to, productId } = {}) {
  const now = Date.now();
  const { from: f, to: t } = resolveRange(range, from, to);
  const periodLen = Math.max(t - f, DAY);
  const prevFrom = f - periodLen;
  const prevTo = f;

  let records = recordsBetween(f, t);
  let prevRecords = recordsBetween(prevFrom, prevTo);
  if (productId) {
    records = records.filter((r) => r.productId === productId);
    prevRecords = prevRecords.filter((r) => r.productId === productId);
  }

  const totalSales = salesOf(records);
  const numberOfSales = records.length;
  const avgTransaction = numberOfSales > 0 ? Math.round(totalSales / numberOfSales) : 0;
  const estimatedProfit = Math.round(totalSales * config.profitMargin);

  // Weekly chart always reflects the last 7 days (independent of the selected
  // range) but still honours the chosen product filter.
  const weekFrom = now - 7 * DAY;
  let weekRecords = recordsBetween(weekFrom, now);
  if (productId) weekRecords = weekRecords.filter((r) => r.productId === productId);
  const weeklyChart = [];
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 6; i >= 0; i--) {
    const dayStart = startOfDay(Date.now() - i * DAY).getTime();
    const dayEnd = dayStart + DAY;
    const daySales = salesOf(
      weekRecords.filter((r) => r.timestamp >= dayStart && r.timestamp < dayEnd)
    );
    const d = new Date(dayStart);
    weeklyChart.push({ day: dow[d.getDay()], date: dayStart, value: daySales });
  }

  // Aggregate by product.
  const agg = new Map();
  for (const r of records) {
    const key = r.productId || r.productName;
    if (!agg.has(key)) {
      agg.set(key, { productName: r.productName, productId: r.productId, units: 0, revenue: 0 });
    }
    const a = agg.get(key);
    a.units += r.quantity;
    a.revenue += r.amount;
  }
  const prevAgg = new Map();
  for (const r of prevRecords) {
    const key = r.productId || r.productName;
    if (!prevAgg.has(key)) prevAgg.set(key, 0);
    prevAgg.set(key, prevAgg.get(key) + r.quantity);
  }

  const ranked = [...agg.values()].sort((a, b) => b.units - a.units);
  const bestSelling = ranked.slice(0, 5).map((a) => ({
    productName: a.productName,
    productId: a.productId,
    units: a.units,
    revenue: a.revenue,
    trend: trend(a.units, prevAgg.get(a.productId || a.productName) || 0),
  }));
  const slowMoving = ranked
    .slice(-5)
    .reverse()
    .map((a) => ({
      productName: a.productName,
      productId: a.productId,
      units: a.units,
      revenue: a.revenue,
      trend: trend(a.units, prevAgg.get(a.productId || a.productName) || 0),
    }));

  return {
    range,
    totalSales,
    numberOfSales,
    avgTransaction,
    estimatedProfit,
    weeklyChart,
    bestSelling,
    slowMoving,
  };
}
