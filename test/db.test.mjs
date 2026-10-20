process.env.SKIP_ENV_FILE = "true";

const { isDbConfigured, getPool } = await import("../src/config/db.js");
const { dbService } = await import("../src/services/dbService.js");

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

async function runTests() {
  console.log("Running PostgreSQL (Neon) service unit & interface tests...");

  check("isDbConfigured export is a function", typeof isDbConfigured === "function");
  check("getPool export is a function", typeof getPool === "function");

  // Verify all expected repository methods exist on dbService
  const methods = [
    "getBusiness",
    "findBusinessByToken",
    "getBusinessById",
    "loginBusiness",
    "updateBusiness",
    "listProducts",
    "getProduct",
    "createProduct",
    "updateProduct",
    "deleteProduct",
    "restockProduct",
    "getProductStats",
    "listRecords",
    "getRecord",
    "createRecord",
    "updateRecord",
    "createScan",
    "listScans",
    "getScan",
    "deleteScan",
    "updateExtractedRow",
    "confirmScan",
    "dashboard",
    "analytics",
    "clearAllData",
  ];

  for (const method of methods) {
    check(`dbService.${method} exists`, typeof dbService[method] === "function");
  }

  if (!isDbConfigured()) {
    // Unconfigured (no DATABASE_URL): helpers return null or fallback values safely
    check("getPool returns null when DATABASE_URL is not set", getPool() === null);

    const biz = await dbService.getBusiness();
    check("dbService.getBusiness returns null when unconfigured", biz === null);

    const products = await dbService.listProducts();
    check("dbService.listProducts returns empty array when unconfigured", Array.isArray(products) && products.length === 0);

    const records = await dbService.listRecords();
    check("dbService.listRecords returns empty array when unconfigured", Array.isArray(records) && records.length === 0);

    const scans = await dbService.listScans();
    check("dbService.listScans returns empty array when unconfigured", Array.isArray(scans) && scans.length === 0);
  } else {
    // Configured: verify basic connectivity
    try {
      const pool = getPool();
      const res = await pool.query("SELECT 1 AS ok");
      check("database connection works (SELECT 1)", res.rows[0].ok === 1);
    } catch (e) {
      check("database connection works (SELECT 1)", false, e.message);
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

runTests();
