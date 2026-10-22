// End-to-end smoke test against a REAL PostgreSQL database.
//
// The app has no mock/in-memory data source anymore, so this test needs a real
// database. Point TEST_DATABASE_URL at a dedicated EMPTY test database:
//
//   TEST_DATABASE_URL=postgres://... psql "$TEST_DATABASE_URL" -f db/schema.sql
//   TEST_DATABASE_URL=postgres://... npm test
//
// The test refuses to run against a database that already holds data and it
// deletes everything it creates when it finishes.

process.env.SKIP_ENV_FILE = "true";

const TEST_DB_URL = process.env.TEST_DATABASE_URL;

if (!TEST_DB_URL) {
  console.log(
    "SKIP  smoke test: set TEST_DATABASE_URL to a dedicated empty PostgreSQL database\n" +
      "      (load the schema first: psql \"$TEST_DATABASE_URL\" -f db/schema.sql)"
  );
  process.exit(0);
}

process.env.DATABASE_URL = TEST_DB_URL;

const { app } = await import("../src/app.js");
const pg = (await import("pg")).default;

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
  console.log("Starting Store Helep smoke test against the test database...");

  const pool = new pg.Pool({ connectionString: TEST_DB_URL, ssl: { rejectUnauthorized: false } });

  // The database must be reachable and empty, otherwise we would pollute it.
  try {
    await pool.query("SELECT 1");
  } catch (e) {
    console.error(`Cannot reach the test database: ${e.message}`);
    process.exit(1);
  }

  const tables = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('businesses','products','records','scans')`
  );
  if (tables.rowCount < 4) {
    console.error(
      "The test database has no Store Helep schema. Run:\n" +
        '  psql "$TEST_DATABASE_URL" -f db/schema.sql'
    );
    process.exit(1);
  }

  const existing = await pool.query("SELECT count(*)::int AS n FROM businesses");
  if (existing.rows[0].n > 0) {
    console.error(
      `The test database already holds ${existing.rows[0].n} business(es). ` +
        "Point TEST_DATABASE_URL at an empty database."
    );
    process.exit(1);
  }

  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const port = server.address().port;
  const BASE = `http://127.0.0.1:${port}`;

  let authToken = "";

  async function json(method, url, body, headers = {}) {
    const res = await fetch(`${BASE}${url}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { token: authToken } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  }

  try {
    const health = await fetch(`${BASE}/api/health`);
    check("health endpoint", health.ok);

    // Business data endpoints require a valid login before anything is exposed.
    const initStats = await json("GET", "/api/products/stats");
    check("unauthenticated product stats are blocked", initStats.status === 401);

    const initDash = await json("GET", "/api/dashboard");
    check("unauthenticated dashboard is blocked", initDash.status === 401);

    // Auth / onboarding fresh business setup
    const setup = await json("POST", "/api/auth/setup", {
      name: "Divine Grace Store",
      phone: "+237612345678",
      type: "Provision store",
      currency: "FCFA",
      location: "Limbe, Cameroon",
      recordMethod: "Notebook",
    });
    check("setup creates business", setup.status === 200 && setup.data.business.name === "Divine Grace Store");
    authToken = setup.data.business.token || "";

    const biz = await json("GET", "/api/business");
    check("get business details", biz.status === 200 && biz.data.business.currency === "FCFA" && biz.data.business.location === "Limbe, Cameroon");

    // Login with existing credentials
    const login = await json("POST", "/api/auth/login", {
      businessName: "Divine Grace Store",
      businessPhone: "+237612345678",
    });
    check("login returns token", login.status === 200 && !!login.data.token);
    authToken = login.data.token || "";

    // Product creation — only the cost price is entered by hand, the selling
    // price is learned from the scans.
    const created1 = await json("POST", "/api/products", {
      name: "Coca-Cola 50Cl",
      category: "Drinks",
      costPrice: 380,
      stockQty: 20,
    });
    check(
      "create product 1",
      created1.status === 201 &&
        created1.data.product.id &&
        created1.data.product.costPrice === 380 &&
        created1.data.product.unitPrice === 0
    );

    const created2 = await json("POST", "/api/products", {
      name: "Rice bag 25kg",
      category: "Groceries",
      stockQty: 3,
    });
    check("create product 2 (low stock)", created2.status === 201 && created2.data.product.stockStatus === "low_stock");

    // A negative cost price is rejected
    const negativeCost = await json("POST", "/api/products", {
      name: "Bad Product",
      category: "Drinks",
      costPrice: -5,
    });
    check("negative cost price rejected", negativeCost.status === 400);

    // Edit product
    const edit = await json("PATCH", `/api/products/${created1.data.product.id}`, {
      name: "Coca-Cola 50Cl Fresh",
      costPrice: 400,
    });
    check(
      "edit product",
      edit.status === 200 &&
        edit.data.product.name === "Coca-Cola 50Cl Fresh" &&
        edit.data.product.costPrice === 400
    );

    // Restock product (add 10 -> stock 3 + 10 = 13)
    const restock = await json("POST", `/api/products/${created2.data.product.id}/restock`, {
      addQty: 10,
    });
    check("restock product", restock.status === 200 && restock.data.product.stockQty === 13);

    // Product stats updated
    const updatedStats = await json("GET", "/api/products/stats");
    check("updated product stats", updatedStats.status === 200 && updatedStats.data.totalProducts === 2);

    // Manual sale record — the cost price is snapshotted from the product and
    // the selling price comes from the sale itself.
    const manual = await json("POST", "/api/records", {
      productId: created1.data.product.id,
      productName: "Coca-Cola 50Cl Fresh",
      quantity: 4,
      unitPrice: 550,
    });
    check("manual record creation", manual.status === 201 && manual.data.record.amount === 2200);
    check("record snapshots the product cost price", manual.data.record.costPrice === 400);

    // Estimated profit = (selling price - cost price) x quantity, summed over
    // the sales of the day: (550 - 400) x 4 = 600.
    const profitDash = await json("GET", "/api/dashboard?lang=en");
    check(
      "dashboard estimated profit is the sum of per-sale profit",
      profitDash.status === 200 && profitDash.data.estimatedProfit === 600
    );

    const profitAna = await json("GET", "/api/analytics?range=30d&lang=en");
    check(
      "analytics estimated profit is the sum of per-sale profit",
      profitAna.status === 200 && profitAna.data.metrics.estimatedProfit === 600
    );

    // A sale whose cost price is unknown contributes no profit.
    const unknownCost = await json("POST", "/api/records", {
      productId: created2.data.product.id,
      productName: "Rice bag 25kg",
      quantity: 2,
      unitPrice: 16000,
    });
    check(
      "record without cost price snapshots 0",
      unknownCost.status === 201 && unknownCost.data.record.costPrice === 0
    );

    const profitDash2 = await json("GET", "/api/dashboard?lang=en");
    check(
      "unknown cost price adds no profit",
      profitDash2.status === 200 && profitDash2.data.estimatedProfit === 600
    );

    // Scanning flow (multipart upload -> OCR). With OCR disabled/unconfigured the
    // API must fail with a clear error — no fake/mock records may be returned.
    const fakeImage = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "base64"
    );
    const fd = new FormData();
    fd.append("image", new Blob([fakeImage], { type: "image/jpeg" }), "sales_page.jpg");
    const scanRes = await fetch(`${BASE}/api/scans`, {
      method: "POST",
      headers: { token: authToken },
      body: fd,
    });
    const scanData = await scanRes.json();

    if (scanRes.status === 201) {
      // Real OCR is enabled: exercise the full review -> confirm flow.
      check("scan upload + extract", Array.isArray(scanData.extracted) && scanData.extracted.length > 0);

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
    } else {
      // OCR disabled: must be a clear error, never fake extracted rows.
      check(
        "scan upload rejected with clear error when OCR unavailable",
        scanRes.status >= 400 && typeof scanData.error === "string" && !Array.isArray(scanData.extracted)
      );
    }

    // Records listing & day grouping (at least the manual record from above)
    const recToday = await json("GET", "/api/records?filter=today");
    check("records today grouped", recToday.status === 200 && Array.isArray(recToday.data.groups) && recToday.data.count >= 1);

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
    const recXlsx = await fetch(`${BASE}/api/export/records/excel`, { headers: { token: authToken } });
    const recBuf = Buffer.from(await recXlsx.arrayBuffer());
    check(
      "export records xlsx",
      recXlsx.status === 200 &&
        recXlsx.headers.get("content-type").includes("spreadsheetml") &&
        recBuf.length > 0
    );

    const prodXlsx = await fetch(`${BASE}/api/export/products/excel`, { headers: { token: authToken } });
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

    // Leave the test database exactly as we found it.
    try {
      await pool.query("DELETE FROM businesses");
      const left = await pool.query(
        "SELECT (SELECT count(*)::int FROM products) AS p, (SELECT count(*)::int FROM records) AS r, (SELECT count(*)::int FROM scans) AS s"
      );
      check("test database left empty", left.rows[0].p === 0 && left.rows[0].r === 0 && left.rows[0].s === 0);
    } catch (e) {
      console.error("Cleanup failed:", e.message);
      failed++;
    }
    await pool.end();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
