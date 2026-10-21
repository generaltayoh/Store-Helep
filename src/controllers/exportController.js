import ExcelJS from "exceljs";
import { recordProfit } from "../services/profitService.js";
import { dbService } from "../services/dbService.js";

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
    const records = await dbService.listRecords({
      filter,
      from,
      to,
      businessId: req.businessId,
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = "Store Helep";
    wb.created = new Date();
    const ws = wb.addWorksheet("Records");

    ws.columns = [
      { header: "Date", key: "date", width: 22 },
      { header: "Time", key: "time", width: 12 },
      { header: "Product", key: "product", width: 28 },
      { header: "Quantity", key: "quantity", width: 12 },
      { header: "Selling Price", key: "unitPrice", width: 14 },
      { header: "Cost Price", key: "costPrice", width: 14 },
      { header: "Amount", key: "amount", width: 14 },
      { header: "Est. Profit", key: "profit", width: 14 },
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
        costPrice: r.costPrice || 0,
        amount: r.amount,
        profit: Math.round(recordProfit(r)),
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
    const products = await dbService.listProducts({
      category,
      stockStatus,
      businessId: req.businessId,
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Products");
    ws.columns = [
      { header: "Name", key: "name", width: 30 },
      { header: "Category", key: "category", width: 16 },
      { header: "Cost Price", key: "costPrice", width: 14 },
      { header: "Last Selling Price", key: "unitPrice", width: 18 },
      { header: "Stock", key: "stockQty", width: 12 },
      { header: "Stock Value", key: "stockValue", width: 16 },
      { header: "Status", key: "status", width: 14 },
    ];

    for (const p of products) {
      const costPrice = Number(p.costPrice || 0);
      ws.addRow({
        name: p.name,
        category: p.category,
        costPrice,
        unitPrice: p.unitPrice || 0,
        stockQty: p.stockQty,
        stockValue: costPrice * p.stockQty,
        status: p.stockStatus,
      });
    }

    await sendWorkbook(res, wb, `store-helep-products-${Date.now()}.xlsx`);
  } catch (e) {
    next(e);
  }
}
