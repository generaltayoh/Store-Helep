import pg from "pg";
import { config } from "./index.js";

let pool = null;

export function isDbConfigured() {
  return Boolean(config.database.url);
}

export function getPool() {
  if (!isDbConfigured()) return null;

  if (!pool) {
    pool = new pg.Pool({
      connectionString: config.database.url,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    // A dead pool must never take the process down.
    pool.on("error", (err) => {
      console.error("[db] idle client error:", err.message);
    });
  }

  return pool;
}

// The database is the only source of truth. When it is not reachable we fail
// loudly instead of serving anything else.
export function requirePool() {
  const p = getPool();
  if (!p) {
    const err = new Error("Database is not configured. Set DATABASE_URL.");
    err.status = 503;
    throw err;
  }
  return p;
}

const CONNECTION_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EAI_AGAIN",
  "57P01", // admin_shutdown
  "57P02", // crash_shutdown
  "57P03", // cannot_connect_now
  "53300", // too_many_connections
]);

export async function query(text, params) {
  const p = requirePool();
  try {
    return await p.query(text, params);
  } catch (e) {
    if (CONNECTION_ERROR_CODES.has(e.code) || /timeout|terminated/i.test(e.message || "")) {
      console.error("[db] connection error:", e.code, e.message);
      const err = new Error("Database is unavailable. Please try again in a moment.");
      err.status = 503;
      throw err;
    }
    throw e;
  }
}
