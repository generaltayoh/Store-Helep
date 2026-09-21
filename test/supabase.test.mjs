import { isSupabaseConfigured, getSupabaseClient } from "../src/config/supabase.js";
import { supabaseService } from "../src/services/supabaseService.js";

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
  console.log("Running Supabase service unit & interface tests...");

  check("isSupabaseConfigured export is a function", typeof isSupabaseConfigured === "function");
  check("getSupabaseClient export is a function", typeof getSupabaseClient === "function");

  // Verify all expected repository methods exist on supabaseService
  const methods = [
    "getBusiness",
    "getBusinessById",
    "loginBusiness",
    "updateBusiness",
    "listProducts",
    "getProduct",
    "createProduct",
    "updateProduct",
    "restockProduct",
    "getProductStats",
    "listRecords",
    "getRecord",
    "createRecord",
    "updateRecord",
    "createScan",
    "listScans",
    "getScan",
    "updateExtractedRow",
    "confirmScan",
    "dashboard",
    "analytics",
  ];

  for (const method of methods) {
    check(`supabaseService.${method} exists`, typeof supabaseService[method] === "function");
  }

  // When unconfigured, helper returns null or fallback values safely
  const client = getSupabaseClient();
  check("getSupabaseClient returns null when no env vars configured", client === null);

  const biz = await supabaseService.getBusiness();
  check("supabaseService.getBusiness returns null when unconfigured", biz === null);

  const products = await supabaseService.listProducts();
  check("supabaseService.listProducts returns empty array when unconfigured", Array.isArray(products) && products.length === 0);

  const records = await supabaseService.listRecords();
  check("supabaseService.listRecords returns empty array when unconfigured", Array.isArray(records) && records.length === 0);

  const scans = await supabaseService.listScans();
  check("supabaseService.listScans returns empty array when unconfigured", Array.isArray(scans) && scans.length === 0);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

runTests();
