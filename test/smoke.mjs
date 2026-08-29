import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

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

const BASE = "http://127.0.0.1:3000";

async function waitForHealth(timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function json(method, url, body, headers = {}) {
  const res = await fetch(`${BASE}${url}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function main() {
  console.log("Starting Store Helep backend...");
  const server = spawn("node", ["server.js"], {
    cwd: root,
    stdio: "ignore",
    env: { ...process.env, OCR_ENABLED: "false" },
  });

  const ok = await waitForHealth();
  if (!ok) {
    console.error("Server did not start in time.");
    server.kill();
    process.exit(1);
  }

  try {
    const health = await fetch(`${BASE}/api/health`);
    check("health endpoint", health.ok);

    // Auth / onboarding
    const login = await json("POST", "/api/auth/login", {
      businessName: "Mama General Store",
      businessEmail: "mamageneral@store.com",
    });
    check("login returns token", login.status === 200 && !!login.data.token, JSON.stringify(login.data));

    const setup = await json("POST", "/api/auth/setup", {
      name: "Mama General Store",
      email: "mamageneral@store.com",
      type: "Grocery / Mini-market",
      currency: "FCFA",
      location: "Molyko, Buea",
      recordMethod: "Notebook",
    });
    check("setup updates business", setup.status === 200 && setup.data.business.name === "Mama General Store");

    const biz = await json("GET", "/api/business");
    check("get business", biz.status === 200 && biz.data.business.currency === "FCFA");

    // Products / inventory
    const stats = await json("GET", "/api/products/stats");
    check(
      "product stats",
      stats.status === 200 &&
        stats.data.totalProducts >= 150 &&
        stats.data.lowStockCount >= 0,
      JSON.stringify(stats.data)
    );

    const low = await json("GET", "/api/products?stockStatus=low_stock");
    check(
      "filter low_stock",
      low.status === 200 && low.data.products.every((p) => p.stockStatus === "low_stock")
    );

    const created = await json("POST", "/api/products", {
      sku: "TST-01",
      name: "Test Product",
      category: "Drinks",
      unitPrice: 350,
      stockQty: 2,
    });
    check("create product", created.status === 201 && created.data.product.id);

    const dup = await json("POST", "/api/products", {
      sku: "TST-01",
      name: "Duplicate",
      category: "Drinks",
      unitPrice: 350,
    });
    check("duplicate sku rejected", dup.status === 409);

    // Edit product
    const edit = await json("PATCH", `/api/products/${created.data.product.id}`, {
      name: "Test Product Edit",
      unitPrice: 400,
    });
    check("edit product", edit.status === 200 && edit.data.product.name === "Test Product Edit" && edit.data.product.unitPrice === 400);

    // Restock product (add 8 -> stock 2 + 8 = 10)
    const restock = await json("POST", "/api/products/" + created.data.product.id + "/restock", {
      addQty: 8,
    });
    check("restock product", restock.status === 201 || restock.status === 200);
    check("restock adds quantity", restock.data && restock.data.product.stockQty === 10);
    const badRestock = await json("POST", "/api/products/" + created.data.product.id + "/restock", { addQty: 0 });
    check("restock rejects non-positive", badRestock.status === 400);

    // Records
    const recToday = await json("GET", "/api/records?filter=today");
    check("records today grouped", recToday.status === 200 && Array.isArray(recToday.data.groups));

    const manual = await json("POST", "/api/records", {
      productName: "Rice bag 25kg",
      quantity: 2,
      unitPrice: 16000,
    });
    check("manual record", manual.status === 201 && manual.data.record.source === "manual");

    // Scanning flow (multipart upload -> mock OCR -> review -> confirm)
    const fakeImage = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "base64"
    );
    const fd = new FormData();
    fd.append("image", new Blob([fakeImage], { type: "image/jpeg" }), "page.jpg");
    const scanRes = await fetch(`${BASE}/api/scans`, { method: "POST", body: fd });
    const scanData = await scanRes.json();
    check("scan upload + extract", scanRes.status === 201 && Array.isArray(scanData.extracted) && scanData.extracted.length > 0);

    const scanId = scanData.id;
    const unknownRow = scanData.extracted.find((r) => r.productName === "Unknown item") || scanData.extracted[0];
    const fixed = await json("PATCH", `/api/scans/${scanId}/records/${unknownRow.id}`, {
      productName: "Coca-Cola 50Cl",
      quantity: 3,
      unitPrice: 500,
    });
    check("edit extracted row", fixed.status === 200);

    const confirm = await json("POST", `/api/scans/${scanId}/confirm`);
    check("confirm scan commits records", confirm.status === 200 && confirm.data.recordsCreated > 0);
    check("scan now saved", confirm.data.scan.status === "saved");
    const recToday2 = await json("GET", "/api/records?filter=today");
    const appeared = recToday2.data.groups.some((g) =>
      g.items.some((it) => it.productName === "Coca-Cola 50Cl")
    );
    check("confirmed scan appears in records", appeared);

    const duplicateConfirm = await json("POST", `/api/scans/${scanId}/confirm`);
    check("double confirm blocked", duplicateConfirm.status === 409);

    // Dashboard
    const dash = await json("GET", "/api/dashboard?lang=fr");
    check(
      "dashboard metrics",
      dash.status === 200 && typeof dash.data.salesToday === "number" && !!dash.data.salesTodayLabel,
      JSON.stringify(dash.data).slice(0, 120)
    );

    // Analytics
    const an = await json("GET", "/api/analytics?range=30d&lang=en");
    check(
      "analytics",
      an.status === 200 &&
        an.data.weeklyChart.length === 7 &&
        Array.isArray(an.data.bestSelling) &&
        Array.isArray(an.data.slowMoving)
    );

    // Export
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
    server.kill();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
