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
    });
  }

  return pool;
}

export async function query(text, params) {
  const p = getPool();
  if (!p) throw new Error("Database is not configured. Set DATABASE_URL.");
  return p.query(text, params);
}
