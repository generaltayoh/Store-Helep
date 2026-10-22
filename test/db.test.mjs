process.env.SKIP_ENV_FILE = "true";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const TEST_DB_URL = process.env.TEST_DATABASE_URL;
if (TEST_DB_URL) process.env.DATABASE_URL = TEST_DB_URL;

const { isDbConfigured, getPool, requirePool } = await import("../src/config/db.js");
const { dbService, productNameSimilarity, findBestProductMatch } = await import(
  "../src/services/dbService.js"
);

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

function readProjectFile(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

async function runTests() {
  console.log("Running PostgreSQL (Neon) service unit & interface tests...");

  check("isDbConfigured export is a function", typeof isDbConfigured === "function");
  check("getPool export is a function", typeof getPool === "function");
  check("requirePool export is a function", typeof requirePool === "function");

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
    // Unconfigured: every call must fail loudly instead of returning empty or
    // fake data.
    check("getPool returns null when DATABASE_URL is not set", getPool() === null);

    let thrown = null;
    try {
      requirePool();
    } catch (e) {
      thrown = e;
    }
    check("requirePool throws a 503 when DATABASE_URL is not set", thrown?.status === 503);

    thrown = null;
    try {
      await dbService.listProducts();
    } catch (e) {
      thrown = e;
    }
    check("dbService.listProducts throws when unconfigured", thrown?.status === 503);
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

  // --------------------------------------------------------------------------
  // No mock / demo data may exist in the system.
  // --------------------------------------------------------------------------
  check("no in-memory store module", !fs.existsSync(path.join(projectRoot, "src", "data", "store.js")));
  check("no seed data module", !fs.existsSync(path.join(projectRoot, "src", "data", "seed.js")));
  check("no seed SQL file", !fs.existsSync(path.join(projectRoot, "db", "seed.sql")));
  check(
    "server does not seed on start",
    !/SEED_ON_START|seed\(\)/.test(readProjectFile("server.js"))
  );

  const sourceFiles = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".js")) sourceFiles.push(full);
    }
  };
  walk(path.join(projectRoot, "src"));

  const offenders = sourceFiles.filter((f) => {
    const src = fs.readFileSync(f, "utf8");
    return /from\s+["'].*data\/store\.js["']/.test(src);
  });
  check("no source file imports the mock store", offenders.length === 0, offenders.join(", "));

  const mockFallbacks = sourceFiles.filter((f) => {
    const src = fs.readFileSync(f, "utf8");
    return /isDbConfigured\(\)/.test(src) && !f.endsWith("db.js") && !f.endsWith("schemaService.js");
  });
  check("no controller falls back to mock data", mockFallbacks.length === 0, mockFallbacks.join(", "));

  // --------------------------------------------------------------------------
  // Fuzzy product matching: a scanned name must link to a similar existing
  // product instead of creating a duplicate.
  // --------------------------------------------------------------------------
  const catalog = [
    { id: "1", name: "Coca-Cola 50cl" },
    { id: "2", name: "Rice bag 25kg" },
    { id: "3", name: "Fanta" },
    { id: "4", name: "Sugar 1kg" },
  ];

  check(
    "matches a shorter scan name to the catalog product",
    findBestProductMatch("Coca", catalog)?.id === "1"
  );
  check(
    "matches case/space/underscore variations",
    findBestProductMatch("coca_cola 50 CL", catalog)?.id === "1"
  );
  check(
    "matches a scan name with extra qualifiers",
    findBestProductMatch("Coca Cola 50cl bottle", catalog)?.id === "1"
  );
  check(
    "matches a misspelled scan name",
    findBestProductMatch("Cocacola 50cl", catalog)?.id === "1"
  );
  check(
    "matches a plural scan name",
    findBestProductMatch("Fanta bottles", catalog)?.id === "3"
  );
  check(
    "does not match clearly different products",
    findBestProductMatch("Bread loaf", catalog) === null
  );
  check(
    "an exact match scores 1",
    productNameSimilarity("Sugar 1kg", "sugar 1 KG") === 1
  );

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

runTests();
