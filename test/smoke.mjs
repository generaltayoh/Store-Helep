import { app } from "../src/app.js";
import { resetStore } from "../src/data/store.js";

let passed = 0;
let failed = 0;

function check(name, cond, extra = "") {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name} ${extra}`);
  }
}

async function main() {
  console.log("Starting Store Helep smoke test on fresh unseeded database...");
  resetStore();

  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const port = server.address().port;
  const BASE = `http://127.0.0.1:${port}`;

  async function json(method, url, body, headers = {}) {
    const res = await fetch(`${BASE}${url}`, {
      method,
      headers: { "Content-Type": "application/json", ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  }

  try {
    const health = await fetch(`${BASE}/api/health`);
    check("health endpoint", health.ok);

    // Initial empty state verification
    const initStats = await json("GET", "/api/products/stats");
    check("clean initial product stats (0 items)", initStats.status === 200 && initStats.data.totalProducts === 0);

    const initDash = await json("GET", "/api/dashboard");
    check("clean initial dashboard (0 sales)", initDash.status === 200 && initDash.data.salesToday === 0);

    // Auth / onboarding fresh business setup
    const setup = await json("POST", "/api/auth/setup", {
      name: "Divine Grace Store",
      email: "divine@grace.com",
      type: "Provision store",
      currency: "FCFA",
      location: "Limbe, Cameroon",
      recordMethod: "Notebook",
    });
    check("setup creates business", setup.status === 200 && setup.data.business.name === "Divine Grace Store");

    const biz = await json("GET", "/api/business");
    check("get business details", biz.status === 200 && biz.data.business.currency === "FCFA" && biz.data.business.location === "Limbe, Cameroon");

    // Login with existing credentials
    const login = await json("POST", "/api/auth/login", {
      businessName: "Divine Grace Store",
      businessEmail: "divine@grace.com",
    });
    check("login returns token", login.status === 200 && !!login.data.token);

    // Product creation
    const created1 = await json("POST", "/api/products", {
      sku: "CC-01",
      name: "Coca-Cola 50Cl",
      category: "Drinks",
      unitPrice: 500,
      stockQty: 20,
    });
    check("create product 1", created1.status === 201 && created1.data.product.id);

    const created2 = await json("POST", "/api/products", {
      sku: "RB-01",
      name: "Rice bag 25kg",
      category: "Groceries",
      unitPrice: 16000,
      stockQty: 3,
    });
    check("create product 2 (low stock)", created2.status === 201 && created2.data.product.stockStatus === "low_stock");

    const dup = await json("POST", "/api/products", {
      sku: "CC-01",
      name: "Duplicate",
      category: "Drinks",
      unitPrice: 500,
    });
    check("duplicate sku rejected", dup.status === 409);

    // Edit product
    const edit = await json("PATCH", `/api/products/${created1.data.product.id}`, {
      name: "Coca-Cola 50Cl Fresh",
      unitPrice: 550,
    });
    check("edit product", edit.status === 200 && edit.data.product.name === "Coca-Cola 50Cl Fresh" && edit.data.product.unitPrice === 550);

    // Restock product (add 10 -> stock 3 + 10 = 13)
    const restock = await json("POST", `/api/products/${created2.data.product.id}/restock`, {
      addQty: 10,
    });
    check("restock product", restock.status === 200 && restock.data.product.stockQty === 13);

    // Product stats updated
    const updatedStats = await json("GET", "/api/products/stats");
    check("updated product stats", updatedStats.status === 200 && updatedStats.data.totalProducts === 2);

    // Manual sale record
    const manual = await json("POST", "/api/records", {
      productId: created1.data.product.id,
      productName: "Coca-Cola 50Cl Fresh",
      quantity: 4,
      unitPrice: 550,
    });
    check("manual record creation", manual.status === 201 && manual.data.record.amount === 2200);

    // Scanning flow (multipart upload -> mock OCR -> review -> confirm)
    const fakeImage = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "base64"
    );
    const fd = new FormData();
    fd.append("image", new Blob([fakeImage], { type: "image/jpeg" }), "sales_page.jpg");
    const scanRes = await fetch(`${BASE}/api/scans`, { method: "POST", body: fd });
    const scanData = await scanRes.json();
    check("scan upload + extract", scanRes.status === 201 && Array.isArray(scanData.extracted) && scanData.extracted.length > 0);

    const scanId = scanData.id;
    const targetRow = scanData.extracted[0];
    const fixed = await json("PATCH", `/api/scans/${scanId}/records/${targetRow.id}`, {
      productName: "Rice bag 25kg",
      quantity: 1,
      unitPrice: 16000,
    });
    check("edit extracted scan row", fixed.status === 200);

    const confirm = await json("POST", `/api/scans/${scanId}/confirm`);
    check("confirm scan commits records", confirm.status === 200 && confirm.data.recordsCreated > 0);
    check("scan status saved", confirm.data.scan.status === "saved");

    const duplicateConfirm = await json("POST", `/api/scans/${scanId}/confirm`);
    check("double confirm blocked", duplicateConfirm.status === 409);

    // Records listing & day grouping
    const recToday = await json("GET", "/api/records?filter=today");
    check("records today grouped", recToday.status === 200 && Array.isArray(recToday.data.groups) && recToday.data.count >= 2);

    // Dashboard with confirmed sales
    const dash = await json("GET", "/api/dashboard?lang=en");
    check(
      "dashboard metrics with sales",
      dash.status === 200 && dash.data.salesToday > 0 && typeof dash.data.salesTodayLabel === "string"
    );

    // Analytics calculation
    const an = await json("GET", "/api/analytics?range=30d&lang=en");
    check(
      "analytics metrics",
      an.status === 200 &&
        an.data.metrics.totalSales > 0 &&
        Array.isArray(an.data.weeklyChart) &&
        an.data.weeklyChart.length === 7
    );

    // Excel exports
    const recXlsx = await fetch(`${BASE}/api/export/records/excel`);
    const recBuf = Buffer.from(await recXlsx.arrayBuffer());
    check(
      "export records xlsx",
      recXlsx.status === 200 &&
        recXlsx.headers.get("content-type").includes("spreadsheetml") &&
        recBuf.length > 0
    );

    const prodXlsx = await fetch(`${BASE}/api/export/products/excel`);
    const prodBuf = Buffer.from(await prodXlsx.arrayBuffer());
    check("export products xlsx", prodXlsx.status === 200 && prodBuf.length > 0);

    // Static frontend served
    const index = await fetch(`${BASE}/dashboard.html`);
    check("serves static frontend", index.status === 200 && (await index.text()).includes("Store Helep"));
  } catch (e) {
    console.error("Test error:", e);
    failed++;
  } finally {
    server.close();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
