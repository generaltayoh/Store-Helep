import ExcelJS from "exceljs";
import { db } from "../data/store.js";
import { resolveRange } from "../services/analyticsService.js";
import { withStatus } from "../services/inventoryService.js";
import { config } from "../config/index.js";

function filterRecordsForExport(filter, from, to) {
  switch (filter) {
    case "needs_review":
      return db.records.filter((r) => r.status === "needs_review");
    case "today":
    case "this_week":
    case "this_month":
    case "custom": {
      const { from: f, to: t } = resolveRange(filter, from, to);
      return db.records.filter((r) => r.timestamp >= f && r.timestamp <= t);
    }
    default:
      return [...db.records];
  }
}

function sendWorkbook(res, workbook, fileName) {
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  return workbook.xlsx.write(res);
}

export async function exportRecords(req, res, next) {
  try {
    const { filter = "all", from, to } = req.query;
    const records = filterRecordsForExport(filter, from, to).sort(
      (a, b) => b.timestamp - a.timestamp
    );

    const wb = new ExcelJS.Workbook();
    wb.creator = "Store Helep";
    wb.created = new Date();
    const ws = wb.addWorksheet("Records");

    ws.columns = [
      { header: "Date", key: "date", width: 22 },
      { header: "Time", key: "time", width: 12 },
      { header: "Product", key: "product", width: 28 },
      { header: "Quantity", key: "quantity", width: 12 },
      { header: "Unit Price", key: "unitPrice", width: 14 },
      { header: "Amount", key: "amount", width: 14 },
      { header: "Source", key: "source", width: 12 },
      { header: "Status", key: "status", width: 14 },
    ];

    for (const r of records) {
      const d = new Date(r.timestamp);
      ws.addRow({
        date: d.toLocaleDateString("en-CM"),
        time: d.toLocaleTimeString("en-CM"),
        product: r.productName,
        quantity: r.quantity,
        unitPrice: r.unitPrice,
        amount: r.amount,
        source: r.source,
        status: r.status,
      });
    }

    await sendWorkbook(res, wb, `store-helep-records-${Date.now()}.xlsx`);
  } catch (e) {
    next(e);
  }
}

export async function exportProducts(req, res, next) {
  try {
    const { category, stockStatus } = req.query;
    let products = db.products;
    if (category) products = products.filter((p) => p.category === category);
    if (stockStatus && stockStatus !== "all") {
      products = products.filter((p) => withStatus(p).stockStatus === stockStatus);
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Products");
    ws.columns = [
      { header: "SKU", key: "sku", width: 14 },
      { header: "Name", key: "name", width: 30 },
      { header: "Category", key: "category", width: 16 },
      { header: "Unit Price", key: "unitPrice", width: 14 },
      { header: "Stock", key: "stockQty", width: 12 },
      { header: "Stock Value", key: "stockValue", width: 16 },
      { header: "Status", key: "status", width: 14 },
    ];

    for (const p of products) {
      const s = withStatus(p);
      ws.addRow({
        sku: p.sku,
        name: p.name,
        category: p.category,
        unitPrice: p.unitPrice,
        stockQty: p.stockQty,
        stockValue: p.unitPrice * p.stockQty,
        status: s.stockStatus,
      });
    }

    await sendWorkbook(res, wb, `store-helep-products-${Date.now()}.xlsx`);
  } catch (e) {
    next(e);
  }
}
