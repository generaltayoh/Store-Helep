import { query, getPool, requirePool } from "../config/db.js";
import { stockStatus } from "./inventoryService.js";
import { resolveRange } from "./analyticsService.js";
import { sumProfit } from "./profitService.js";

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Every write must belong to exactly one business. Never fall back to the
// first business in the database: that would let accounts affect each other.
function requireBusinessId(businessId) {
  if (!businessId) {
    const err = new Error("A business is required for this operation.");
    err.status = 400;
    throw err;
  }
  return businessId;
}

// Map snake_case database row to camelCase business object
function mapBusiness(biz, settings) {
  if (!biz) return null;
  return {
    id: biz.id,
    name: biz.name,
    email: biz.email,
    type: biz.type,
    currency: biz.currency,
    location: biz.location,
    recordMethod: biz.record_method,
    token: biz.token,
    createdAt: biz.created_at,
    settings: {
      language: settings?.language || "en",
      darkMode: Boolean(settings?.dark_mode),
    },
  };
}

// Map snake_case database row to camelCase product object
function mapProduct(p) {
  if (!p) return null;
  const stockQty = Number(p.stock_qty || 0);
  // unit_price holds the last price the product was actually sold at (learned
  // from scans); cost_price is what the store paid for one unit.
  const unitPrice = Number(p.unit_price || 0);
  const costPrice = Number(p.cost_price || 0);
  return {
    id: p.id,
    businessId: p.business_id,
    name: p.name,
    category: p.category,
    unitPrice,
    costPrice,
    stockQty,
    stockValue: costPrice * stockQty,
    stockStatus: stockStatus(stockQty),
  };
}

// Map snake_case database row to camelCase record object
function mapRecord(r) {
  if (!r) return null;
  return {
    id: r.id,
    businessId: r.business_id,
    productId: r.product_id,
    productName: r.product_name,
    quantity: Number(r.quantity || 0),
    unitPrice: Number(r.unit_price || 0),
    costPrice: Number(r.cost_price || 0),
    amount: Number(r.amount || 0),
    timestamp: new Date(r.timestamp),
    source: r.source,
    status: r.status,
    scanId: r.scan_id,
  };
}

// Product names written in notebooks are rarely spelled exactly like the
// catalog entry ("Coca" vs "Coca-Cola 50cl" vs "coca cola"). Normalise names and
// compare them so a scanned row is linked to the closest existing product
// instead of creating a duplicate.
const PRODUCT_MATCH_THRESHOLD = 0.72;

function normaliseProductName(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function editDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    previous = current;
  }
  return previous[b.length];
}

function productNameSimilarity(a, b) {
  const na = normaliseProductName(a);
  const nb = normaliseProductName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const compactA = na.replace(/\s+/g, "");
  const compactB = nb.replace(/\s+/g, "");
  if (compactA === compactB) return 1;

  const lev =
    1 - editDistance(compactA, compactB) / Math.max(compactA.length, compactB.length);

  const tokensA = na.split(" ");
  const tokensB = nb.split(" ");
  const setB = new Set(tokensB);
  let common = 0;
  for (const token of tokensA) {
    if (setB.has(token)) common++;
  }
  const dice = (2 * common) / (tokensA.length + tokensB.length);

  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length <= nb.length ? nb : na;
  const contained = ` ${longer} `.includes(` ${shorter} `) ? 1 : 0;

  return Math.max(lev, dice, contained * 0.96);
}

function findBestProductMatch(name, products) {
  let best = null;
  let bestScore = 0;
  for (const product of products || []) {
    const candidate = product.name || product.productName;
    const score = productNameSimilarity(name, candidate);
    if (score > bestScore) {
      best = product;
      bestScore = score;
    }
  }
  return bestScore >= PRODUCT_MATCH_THRESHOLD ? best : null;
}

// Map scan row and extracted items
async function mapScan(scan, items = []) {
  if (!scan) return null;
  let productCatalog = [];
  try {
    if (scan.business_id) {
      productCatalog = await dbService.listProducts({ businessId: scan.business_id });
    }
  } catch (e) { /* ignore */ }
  const extracted = (items || []).map((i) => {
    const name = i.product_name || "Unknown item";
    const isUnknown = productCatalog.length === 0 ? true : !findBestProductMatch(name, productCatalog);
    return {
      id: i.id,
      productName: name,
      quantity: Number(i.quantity || 1),
      unitPrice: Number(i.unit_price || 0),
      date: new Date(i.date || scan.created_at),
      confidence: Number(i.confidence || 0.9),
      isUnknown,
    };
  });

  const needsReview =
    scan.status === "needs_review" ||
    extracted.some(
      (r) => r.confidence < 0.6 || r.productName === "Unknown item" || r.unitPrice === 0
    );

  return {
    id: scan.id,
    businessId: scan.business_id,
    fileName: scan.file_name,
    imageUrl: scan.image_url,
    createdAt: new Date(scan.created_at),
    confirmedAt: scan.confirmed_at ? new Date(scan.confirmed_at) : null,
    status: scan.status,
    recordCount: extracted.length,
    extracted,
    needsReview,
  };
}

async function withTransaction(fn) {
  const pool = requirePool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export const dbService = {
  // --------------------------------------------------------------------------
  // Business & Settings
  // --------------------------------------------------------------------------
  async getBusiness(businessId) {
    requirePool();

    let biz = null;
    if (businessId) {
      const { rows } = await query("SELECT * FROM businesses WHERE id = $1", [businessId]);
      biz = rows[0] || null;
    } else {
      const { rows } = await query("SELECT * FROM businesses ORDER BY created_at ASC LIMIT 1");
      biz = rows[0] || null;
    }
    if (!biz) return null;

    const { rows } = await query("SELECT * FROM business_settings WHERE business_id = $1", [biz.id]);
    return mapBusiness(biz, rows[0]);
  },

  async findBusinessByToken(token) {
    requirePool();
    const { rows } = await query(
      "SELECT id, name, email, token, type, currency, location, record_method, created_at, updated_at FROM businesses WHERE token = $1",
      [token]
    );
    return rows[0] || null;
  },

  async findBusinessByNameAndPhone(name, phone) {
    requirePool();
    const { rows } = await query("SELECT * FROM businesses WHERE name = $1 AND email = $2", [name, phone]);
    const biz = rows[0] || null;
    if (!biz) return null;
    const { rows: srows } = await query("SELECT * FROM business_settings WHERE business_id = $1", [biz.id]);
    return mapBusiness(biz, srows[0]);
  },

  async findByName(name) {
    requirePool();
    const { rows } = await query("SELECT * FROM businesses WHERE name = $1", [name]);
    return rows[0] || null;
  },

  async findByPhone(phone) {
    requirePool();
    const { rows } = await query("SELECT * FROM businesses WHERE email = $1", [phone]);
    return rows[0] || null;
  },

  async getBusinessById(id) {
    requirePool();
    const { rows } = await query("SELECT * FROM businesses WHERE id = $1", [id]);
    const biz = rows[0] || null;
    if (!biz) return null;
    const { rows: srows } = await query("SELECT * FROM business_settings WHERE business_id = $1", [biz.id]);
    return mapBusiness(biz, srows[0]);
  },

  async loginBusiness({ businessName, businessEmail, token }) {
    requirePool();

    return withTransaction(async (client) => {
      const { rows } = await client.query("SELECT * FROM businesses WHERE email = $1", [businessEmail]);
      let bizRecord = rows[0] || null;

      if (!bizRecord) {
        const { rows: createdRows } = await client.query(
          `INSERT INTO businesses (name, email, token, type, currency, record_method)
           VALUES ($1, $2, $3, 'Grocery / Mini-market', 'FCFA', 'Notebook')
           RETURNING *`,
          [businessName, businessEmail, token]
        );
        bizRecord = createdRows[0];
        await client.query(
          "INSERT INTO business_settings (business_id, language, dark_mode) VALUES ($1, 'en', false)",
          [bizRecord.id]
        );
      } else {
        const { rows: updatedRows } = await client.query(
          "UPDATE businesses SET name = $1, token = $2 WHERE id = $3 RETURNING *",
          [businessName, token, bizRecord.id]
        );
        bizRecord = updatedRows[0];
      }

      const { rows: srows } = await client.query(
        "SELECT * FROM business_settings WHERE business_id = $1",
        [bizRecord.id]
      );
      return mapBusiness(bizRecord, srows[0]);
    });
  },

  async updateBusiness(id, updates) {
    requirePool();

    const colMap = {
      name: "name",
      email: "email",
      type: "type",
      currency: "currency",
      location: "location",
      recordMethod: "record_method",
      token: "token",
    };

    const vals = [];
    const sets = [];
    for (const [key, col] of Object.entries(colMap)) {
      if (updates[key] !== undefined) {
        vals.push(updates[key]);
        sets.push(`${col} = $${vals.length}`);
      }
    }

    let bizRecord = null;
    if (sets.length > 0) {
      vals.push(id);
      const { rows } = await query(
        `UPDATE businesses SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING *`,
        vals
      );
      bizRecord = rows[0];
    } else {
      const { rows } = await query("SELECT * FROM businesses WHERE id = $1", [id]);
      bizRecord = rows[0];
    }

    const settingsUpdates = {};
    if (updates.language !== undefined) settingsUpdates.language = updates.language;
    if (updates.darkMode !== undefined) settingsUpdates.dark_mode = Boolean(updates.darkMode);

    let settingsRecord = null;
    const sKeys = Object.keys(settingsUpdates);
    if (sKeys.length > 0) {
      const sVals = [id, ...sKeys.map((k) => settingsUpdates[k])];
      const ph = sVals.map((_, i) => `$${i + 1}`).join(", ");
      const setClause = sKeys.map((k, i) => `${k} = $${i + 2}`).join(", ");
      const { rows } = await query(
        `INSERT INTO business_settings (business_id, ${sKeys.join(", ")})
         VALUES (${ph})
         ON CONFLICT (business_id) DO UPDATE SET ${setClause}
         RETURNING *`,
        sVals
      );
      settingsRecord = rows[0];
    } else {
      const { rows } = await query("SELECT * FROM business_settings WHERE business_id = $1", [id]);
      settingsRecord = rows[0];
    }

    return mapBusiness(bizRecord, settingsRecord);
  },

  // --------------------------------------------------------------------------
  // Products / Inventory
  // --------------------------------------------------------------------------
  async listProducts({ category, stockStatus: statusFilter, businessId } = {}) {
    requirePool();
    if (!businessId) return [];

    const conditions = [];
    const vals = [];
    if (businessId) {
      vals.push(businessId);
      conditions.push(`business_id = $${vals.length}`);
    }
    if (category) {
      vals.push(category);
      conditions.push(`category = $${vals.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await query(`SELECT * FROM products ${where} ORDER BY name ASC`, vals);

    let products = rows.map(mapProduct);
    if (statusFilter && statusFilter !== "all") {
      products = products.filter((p) => p.stockStatus === statusFilter);
    }
    return products;
  },

  async getProduct(id) {
    requirePool();
    const { rows } = await query("SELECT * FROM products WHERE id = $1", [id]);
    return mapProduct(rows[0] || null);
  },

  // The catalog holds the cost price only. unitPrice is the last price the
  // product was sold at, which is set from the scans.
  async createProduct({ name, category, unitPrice = 0, costPrice = 0, stockQty = 0, businessId }) {
    requirePool();

    const targetBizId = requireBusinessId(businessId);

    const { rows } = await query(
      `INSERT INTO products (business_id, name, category, unit_price, cost_price, stock_qty)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        targetBizId,
        name,
        category,
        Number(unitPrice),
        Number(costPrice) || 0,
        Number(stockQty),
      ]
    );
    return mapProduct(rows[0]);
  },

  async updateProduct(id, updates) {
    requirePool();

    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.unitPrice !== undefined) payload.unit_price = Number(updates.unitPrice);
    if (updates.costPrice !== undefined) payload.cost_price = Number(updates.costPrice);
    if (updates.stockQty !== undefined) payload.stock_qty = Number(updates.stockQty);

    const keys = Object.keys(payload);
    const vals = keys.map((k) => payload[k]);
    vals.push(id);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");

    const { rows } = await query(
      `UPDATE products SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      vals
    );
    return mapProduct(rows[0]);
  },

  async deleteProduct(id) {
    requirePool();
    const { rowCount } = await query("DELETE FROM products WHERE id = $1", [id]);
    return rowCount > 0;
  },

  async restockProduct(id, addQty) {
    const current = await this.getProduct(id);
    if (!current) return null;
    const newStock = (current.stockQty || 0) + Number(addQty);
    return this.updateProduct(id, { stockQty: newStock });
  },

  async getProductStats(businessId) {
    const products = await this.listProducts({ businessId });
    let totalStockValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of products) {
      // Stock is valued at cost: the catalog only knows what the store paid.
      totalStockValue += (p.costPrice || 0) * p.stockQty;
      if (p.stockStatus === "low_stock") lowStockCount++;
      if (p.stockStatus === "out_of_stock") outOfStockCount++;
    }

    return {
      totalProducts: products.length,
      totalStockValue,
      lowStockCount,
      outOfStockCount,
    };
  },

  // --------------------------------------------------------------------------
  // Records
  // --------------------------------------------------------------------------
  async listRecords({ filter = "all", from, to, businessId } = {}) {
    requirePool();
    if (!businessId) return [];

    const conditions = [];
    const vals = [];
    if (businessId) {
      vals.push(businessId);
      conditions.push(`business_id = $${vals.length}`);
    }
    if (filter === "needs_review") {
      conditions.push(`status = 'needs_review'`);
    } else if (["today", "this_week", "this_month", "custom"].includes(filter)) {
      const { from: f, to: t } = resolveRange(filter, from, to);
      vals.push(new Date(f), new Date(t));
      conditions.push(`timestamp BETWEEN $${vals.length - 1} AND $${vals.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await query(`SELECT * FROM records ${where} ORDER BY timestamp DESC`, vals);
    return rows.map(mapRecord);
  },

  async getRecord(id) {
    requirePool();
    const { rows } = await query("SELECT * FROM records WHERE id = $1", [id]);
    return mapRecord(rows[0] || null);
  },

  async createRecord({
    productId,
    productName,
    quantity,
    unitPrice,
    costPrice,
    timestamp,
    source = "manual",
    status = "saved",
    scanId = null,
    businessId,
  }) {
    requirePool();

    const targetBizId = requireBusinessId(businessId);

    const qty = Number(quantity);
    const price = Number(unitPrice);
    const amount = qty * price;

    // Snapshot the product's cost price onto the sale so that editing the
    // catalog later never rewrites the profit of this record.
    let cost = costPrice === undefined || costPrice === null ? undefined : Number(costPrice);
    if (cost === undefined && productId) {
      const { rows: prodRows } = await query(
        "SELECT cost_price FROM products WHERE id = $1",
        [productId]
      );
      cost = Number(prodRows[0]?.cost_price || 0);
    }
    if (cost === undefined && productName && targetBizId) {
      const { rows: prodRows } = await query(
        "SELECT cost_price FROM products WHERE business_id = $1 AND lower(name) = lower($2) LIMIT 1",
        [targetBizId, productName]
      );
      cost = Number(prodRows[0]?.cost_price || 0);
    }
    if (cost === undefined) cost = 0;

    const { rows } = await query(
      `INSERT INTO records (business_id, product_id, product_name, quantity, unit_price, cost_price, amount, timestamp, source, status, scan_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        targetBizId,
        productId || null,
        productName,
        qty,
        price,
        cost,
        amount,
        timestamp ? new Date(timestamp) : new Date(),
        source,
        status,
        scanId,
      ]
    );
    return mapRecord(rows[0]);
  },

  async updateRecord(id, updates) {
    requirePool();

    const payload = {};
    if (updates.productName !== undefined) payload.product_name = updates.productName;
    if (updates.quantity !== undefined) payload.quantity = Number(updates.quantity);
    if (updates.unitPrice !== undefined) payload.unit_price = Number(updates.unitPrice);
    if (updates.costPrice !== undefined) payload.cost_price = Number(updates.costPrice);
    if (updates.status !== undefined) payload.status = updates.status;

    if (payload.quantity !== undefined || payload.unit_price !== undefined) {
      const existing = await this.getRecord(id);
      const qty = payload.quantity !== undefined ? payload.quantity : existing.quantity;
      const price = payload.unit_price !== undefined ? payload.unit_price : existing.unitPrice;
      payload.amount = qty * price;
    }

    const keys = Object.keys(payload);
    const vals = keys.map((k) => payload[k]);
    vals.push(id);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");

    const { rows } = await query(
      `UPDATE records SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      vals
    );
    return mapRecord(rows[0]);
  },

  // --------------------------------------------------------------------------
  // Scans & Extracted Items
  // --------------------------------------------------------------------------
  async createScan({ fileName, imageUrl = null, extracted = [], businessId }) {
    requirePool();

    const targetBizId = requireBusinessId(businessId);

    return withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO scans (business_id, file_name, image_url, status)
         VALUES ($1, $2, $3, 'needs_review')
         RETURNING *`,
        [targetBizId, fileName, imageUrl]
      );
      const scan = rows[0];

      let insertedItems = [];
      if (extracted.length > 0) {
        const vals = [];
        const tuples = extracted.map((row) => {
          vals.push(
            scan.id,
            row.productName,
            row.quantity || 1,
            row.unitPrice || 0,
            row.date ? new Date(row.date) : new Date(),
            row.confidence || 0.9
          );
          const b = vals.length - 6;
          return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6})`;
        });
        const { rows: items } = await client.query(
          `INSERT INTO scan_extracted_items (scan_id, product_name, quantity, unit_price, date, confidence)
           VALUES ${tuples.join(", ")}
           RETURNING *`,
          vals
        );
        insertedItems = items;
      }

      return mapScan(scan, insertedItems);
    });
  },

  async listScans(businessId) {
    requirePool();
    if (!businessId) return [];

    let scans;
    if (businessId) {
      ({ rows: scans } = await query(
        "SELECT * FROM scans WHERE business_id = $1 ORDER BY created_at DESC",
        [businessId]
      ));
    } else {
      ({ rows: scans } = await query("SELECT * FROM scans ORDER BY created_at DESC"));
    }
    if (!scans || scans.length === 0) return [];

    const scanIds = scans.map((s) => s.id);
    const { rows: items } = await query(
      "SELECT * FROM scan_extracted_items WHERE scan_id = ANY($1)",
      [scanIds]
    );

    const itemsByScanId = new Map();
    for (const item of items || []) {
      if (!itemsByScanId.has(item.scan_id)) itemsByScanId.set(item.scan_id, []);
      itemsByScanId.get(item.scan_id).push(item);
    }

    return Promise.all(scans.map(async (s) => await mapScan(s, itemsByScanId.get(s.id) || [])));
  },

  async getScan(id) {
    requirePool();

    const { rows: scans } = await query("SELECT * FROM scans WHERE id = $1", [id]);
    const scan = scans[0] || null;
    if (!scan) return null;

    const { rows: items } = await query(
      "SELECT * FROM scan_extracted_items WHERE scan_id = $1",
      [id]
    );

    return mapScan(scan, items || []);
  },

  async deleteScan(id) {
    requirePool();
    const { rowCount } = await query("DELETE FROM scans WHERE id = $1", [id]);
    return rowCount > 0;
  },

  async updateExtractedRow(scanId, rowId, updates) {
    requirePool();

    const payload = {};
    if (updates.productName !== undefined) payload.product_name = updates.productName;
    if (updates.quantity !== undefined) payload.quantity = Number(updates.quantity);
    if (updates.unitPrice !== undefined) payload.unit_price = Number(updates.unitPrice);
    if (updates.date !== undefined) payload.date = new Date(updates.date);

    if (payload.product_name && payload.product_name !== "Unknown item" && payload.unit_price > 0) {
      payload.confidence = 0.95;
    }

    const keys = Object.keys(payload);
    if (keys.length > 0) {
      const vals = keys.map((k) => payload[k]);
      vals.push(rowId, scanId);
      const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
      await query(
        `UPDATE scan_extracted_items SET ${setClause} WHERE id = $${keys.length + 1} AND scan_id = $${keys.length + 2}`,
        vals
      );
    }

    return this.getScan(scanId);
  },

  async confirmScan(scanId) {
    const scan = await this.getScan(scanId);
    if (!scan) throw new Error("Scan not found");
    if (scan.status === "saved") {
      const err = new Error("Scan already confirmed.");
      err.status = 409;
      throw err;
    }

    const defaultBizId = scan.businessId;
    if (!defaultBizId) throw new Error("Scan is not linked to a business.");

    // Fetch current products to match unknown items
    let currentProducts = [];
    try {
      currentProducts = await this.listProducts({ businessId: defaultBizId });
    } catch (e) { /* ignore */ }

    // Helper to find or create product, and restock matched products
    async function findOrCreateProduct(row) {
      const scannedName = row.productName || row.product_name || "Unknown item";
      const scannedPrice = Number(row.unitPrice || row.unit_price || 0);
      const match = findBestProductMatch(scannedName, currentProducts);
      if (match) {
        // Sales reduce stock
        const current = await dbService.getProduct(match.id);
        const newStock = Math.max(0, (current?.stockQty || 0) - Number(row.quantity || 1));
        // The selling price is learned from the scan: remember the price this
        // product was actually sold at.
        await dbService.updateProduct(match.id, { stockQty: newStock, unitPrice: scannedPrice });
        // Snapshot the cost price so the profit of this sale stays stable.
        return {
          productId: match.id,
          productName: match.name,
          costPrice: Number(match.costPrice || current?.costPrice || 0),
        };
      }
      // Create new product for unknown/unmatched items
      const newProd = await dbService.createProduct({
        name: scannedName,
        category: "Other",
        unitPrice: scannedPrice,
        costPrice: 0,
        stockQty: 0,
        businessId: defaultBizId,
      });
      if (newProd) currentProducts.push(newProd);
      return {
        productId: newProd ? newProd.id : null,
        productName: newProd ? newProd.name : scannedName,
        costPrice: 0,
      };
    }

    const recordsToInsert = [];
    const confirmedAt = new Date();
    for (const row of scan.extracted || []) {
      const { productId, productName, costPrice } = await findOrCreateProduct(row);
      recordsToInsert.push([
        defaultBizId,
        productId,
        productName,
        Number(row.quantity || 1),
        Number(row.unitPrice || row.unit_price || 0),
        costPrice,
        Number(row.quantity || 1) * Number(row.unitPrice || row.unit_price || 0),
        scan.createdAt || confirmedAt,
        "scanned",
        "saved",
        scan.id,
      ]);
    }

    await withTransaction(async (client) => {
      if (recordsToInsert.length > 0) {
        const vals = [];
        const tuples = recordsToInsert.map((r) => {
          vals.push(...r);
          const b = vals.length - 11;
          return `(${Array.from({ length: 11 }, (_, i) => `$${b + i + 1}`).join(", ")})`;
        });
        await client.query(
          `INSERT INTO records (business_id, product_id, product_name, quantity, unit_price, cost_price, amount, timestamp, source, status, scan_id)
           VALUES ${tuples.join(", ")}`,
          vals
        );
      }
      await client.query("UPDATE scans SET status = 'saved', confirmed_at = $2 WHERE id = $1", [scanId, confirmedAt]);
    });

    const updatedScan = await this.getScan(scanId);
    return { scan: updatedScan, recordsCreated: recordsToInsert.length };
  },

  // --------------------------------------------------------------------------
  // Dashboard & Analytics
  // --------------------------------------------------------------------------
  async dashboard(businessId) {
    const now = Date.now();
    const todayStart = startOfDay(now).getTime();
    const yesterdayStart = todayStart - DAY;

    const allRecords = await this.listRecords({ businessId });
    const savedRecords = allRecords.filter((r) => r.status === "saved");

    const todayRecords = savedRecords.filter((r) => r.timestamp.getTime() >= todayStart);
    const yesterdayRecords = savedRecords.filter(
      (r) => r.timestamp.getTime() >= yesterdayStart && r.timestamp.getTime() < todayStart
    );

    const salesToday = todayRecords.reduce((s, r) => s + (r.amount || 0), 0);
    const salesYesterday = yesterdayRecords.reduce((s, r) => s + (r.amount || 0), 0);
    const salesDeltaPct =
      salesYesterday > 0 ? Math.round(((salesToday - salesYesterday) / salesYesterday) * 100) : 0;

    const stats = await this.getProductStats(businessId);

    const attention = [];
    if (stats.lowStockCount > 0) {
      attention.push({
        type: "low_stock",
        message: `${stats.lowStockCount} products are low in stock`,
      });
    }
    if (stats.outOfStockCount > 0) {
      attention.push({
        type: "out_of_stock",
        message: `${stats.outOfStockCount} products are out of stock`,
      });
    }

    const unitsSold = todayRecords.reduce((s, r) => s + (r.quantity || 0), 0);

    return {
      salesToday,
      salesDeltaPct,
      transactionsToday: todayRecords.length,
      estimatedProfit: Math.round(sumProfit(todayRecords)),
      unitsSold,
      lowStockCount: stats.lowStockCount,
      outOfStockCount: stats.outOfStockCount,
      attention,
    };
  },

  async analytics({ range = "30d", from, to, productId, businessId } = {}) {
    const now = Date.now();
    const { from: f, to: t } = resolveRange(range, from, to);
    const periodLen = Math.max(t - f, DAY);
    const prevFrom = f - periodLen;
    const prevTo = f;

    const allRecords = await this.listRecords({ businessId });
    const savedRecords = allRecords.filter((r) => r.status === "saved");

    let records = savedRecords.filter(
      (r) => r.timestamp.getTime() >= f && r.timestamp.getTime() <= t
    );
    let prevRecords = savedRecords.filter(
      (r) => r.timestamp.getTime() >= prevFrom && r.timestamp.getTime() <= prevTo
    );

    if (productId) {
      records = records.filter((r) => r.productId === productId);
      prevRecords = prevRecords.filter((r) => r.productId === productId);
    }

    const totalSales = records.reduce((s, r) => s + (r.amount || 0), 0);
    const numberOfSales = records.length;
    const avgTransaction = numberOfSales > 0 ? Math.round(totalSales / numberOfSales) : 0;
    const estimatedProfit = Math.round(sumProfit(records));

    const weekFrom = now - 7 * DAY;
    let weekRecords = savedRecords.filter(
      (r) => r.timestamp.getTime() >= weekFrom && r.timestamp.getTime() <= now
    );
    if (productId) weekRecords = weekRecords.filter((r) => r.productId === productId);

    const weeklyChart = [];
    const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const dayStart = startOfDay(Date.now() - i * DAY).getTime();
      const dayEnd = dayStart + DAY;
      const daySales = weekRecords
        .filter((r) => r.timestamp.getTime() >= dayStart && r.timestamp.getTime() < dayEnd)
        .reduce((s, r) => s + (r.amount || 0), 0);
      const d = new Date(dayStart);
      weeklyChart.push({ day: dow[d.getDay()], date: dayStart, value: daySales });
    }

    // Aggregations
    const agg = new Map();
    for (const r of records) {
      const key = r.productId || r.productName;
      if (!agg.has(key)) {
        agg.set(key, { productName: r.productName, productId: r.productId, units: 0, revenue: 0 });
      }
      const a = agg.get(key);
      a.units += r.quantity;
      a.revenue += r.amount;
    }

    const prevAgg = new Map();
    for (const r of prevRecords) {
      const key = r.productId || r.productName;
      if (!prevAgg.has(key)) prevAgg.set(key, 0);
      prevAgg.set(key, prevAgg.get(key) + r.quantity);
    }

    function trend(current, previous) {
      if (previous === 0 && current === 0) return "steady";
      if (previous === 0) return "up";
      const pct = ((current - previous) / previous) * 100;
      if (pct > 5) return "up";
      if (pct < -5) return "down";
      return "steady";
    }

    const ranked = [...agg.values()].sort((a, b) => b.units - a.units);
    const bestSelling = ranked.slice(0, 5).map((a) => ({
      productName: a.productName,
      productId: a.productId,
      units: a.units,
      revenue: a.revenue,
      trend: trend(a.units, prevAgg.get(a.productId || a.productName) || 0),
    }));

    const slowMoving = ranked
      .slice(-5)
      .reverse()
      .map((a) => ({
        productName: a.productName,
        productId: a.productId,
        units: a.units,
        revenue: a.revenue,
        trend: trend(a.units, prevAgg.get(a.productId || a.productName) || 0),
      }));

    return {
      range,
      totalSales,
      numberOfSales,
      avgTransaction,
      estimatedProfit,
      weeklyChart,
      bestSelling,
      slowMoving,
    };
  },

  async clearAllData(businessId) {
    requirePool();
    const targetBizId = requireBusinessId(businessId);

    await query(
      "DELETE FROM scan_extracted_items WHERE scan_id IN (SELECT id FROM scans WHERE business_id = $1)",
      [targetBizId]
    );
    await query("DELETE FROM records WHERE business_id = $1", [targetBizId]);
    await query("DELETE FROM scans WHERE business_id = $1", [targetBizId]);
    await query("DELETE FROM products WHERE business_id = $1", [targetBizId]);
  },
};

export { productNameSimilarity, findBestProductMatch, normaliseProductName };
