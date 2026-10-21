// Estimated profit is derived from the actual prices of a sale:
//   estimated profit = (selling price - cost price) x quantity
//
// The selling price is the price that was scanned from the receipt (stored on
// the record as unitPrice). The cost price is what the store paid for the
// product; it is snapshotted onto the record at sale time so that later edits
// to the product catalog do not rewrite past profit.
//
// Sales whose cost price is unknown (0) contribute no profit.

export function recordCostPrice(record) {
  if (!record) return 0;
  return Number(record.costPrice ?? record.cost_price ?? 0) || 0;
}

// Profit earned by a single sale line.
// A cost price of 0 means the cost is unknown, so the sale contributes no
// estimated profit instead of being counted as if it were all margin.
export function recordProfit(record) {
  if (!record) return 0;
  const costPrice = recordCostPrice(record);
  if (costPrice <= 0) return 0;
  const sellingPrice = Number(record.unitPrice ?? record.unit_price ?? 0) || 0;
  const quantity = Number(record.quantity || 0) || 0;
  return (sellingPrice - costPrice) * quantity;
}

// Profit earned across a set of sales.
export function sumProfit(records) {
  if (!records || records.length === 0) return 0;
  return records.reduce((sum, r) => sum + recordProfit(r), 0);
}
