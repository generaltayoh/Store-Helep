import { getPool, isDbConfigured } from "../config/db.js";

// Additive, idempotent schema upgrades applied when the server boots.
// Keeps the running database in step with the code without a manual migration
// step. Every statement is safe to run repeatedly.
const MIGRATIONS = [
  `ALTER TABLE products
     ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0`,
  `ALTER TABLE records
     ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0`,
];

let applied = false;

export async function ensureSchema() {
  if (applied) return true;
  if (!isDbConfigured() || !getPool()) return false;

  for (const sql of MIGRATIONS) {
    await getPool().query(sql);
  }
  applied = true;
  return true;
}
