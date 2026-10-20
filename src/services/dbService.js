import { query, getPool } from "../config/db.js";
import { config } from "../config/index.js";
import { stockStatus } from "./inventoryService.js";
import { resolveRange } from "./analyticsService.js";

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
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
  const unitPrice = Number(p.unit_price || 0);
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    unitPrice,
    stockQty,
    stockValue: unitPrice * stockQty,
    stockStatus: stockStatus(stockQty),
  };
}

// Map snake_case database row to camelCase record object
function mapRecord(r) {
  if (!r) return null;
  return {
    id: r.id,
    productId: r.product_id,
    productName: r.product_name,
    quantity: Number(r.quantity || 0),
    unitPrice: Number(r.unit_price || 0),
    amount: Number(r.amount || 0),
    timestamp: new Date(r.timestamp),
    source: r.source,
    status: r.status,
    scanId: r.scan_id,
  };
}

function fuzzyMatch(name, candidates) {
  const n = (name || "").toLowerCase().trim();
  for (const c of candidates) {
    const cn = (c.name || c.productName || "").toLowerCase().trim();
    if (n === cn) return true;
    if (n.includes(cn) || cn.includes(n)) return true;
    const words = cn.split(/\s+/);
    for (const w of words) {
      if (w.length > 2 && n.includes(w)) return true;
    }
  }
  return false;
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
    const isUnknown = productCatalog.length === 0 ? true : !fuzzyMatch(name, productCatalog);
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
  const pool = getPool();
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
    if (!getPool()) return null;

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
    if (!getPool()) return null;
    const { rows } = await query(
      "SELECT id, name, email, token, type, currency, location, record_method, created_at, updated_at FROM businesses WHERE token = $1",
      [token]
    );
    return rows[0] || null;
  },

  async findBusinessByNameAndPhone(name, phone) {
    if (!getPool()) return null;
    const { rows } = await query("SELECT * FROM businesses WHERE name = $1 AND email = $2", [name, phone]);
    const biz = rows[0] || null;
    if (!biz) return null;
    const { rows: srows } = await query("SELECT * FROM business_settings WHERE business_id = $1", [biz.id]);
    return mapBusiness(biz, srows[0]);
  },

  async findByName(name) {
    if (!getPool()) return null;
    const { rows } = await query("SELECT * FROM businesses WHERE name = $1", [name]);
    return rows[0] || null;
  },

  async findByPhone(phone) {
    if (!getPool()) return null;
    const { rows } = await query("SELECT * FROM businesses WHERE email = $1", [phone]);
    return rows[0] || null;
  },

  async getBusinessById(id) {
    if (!getPool()) return null;
    const { rows } = await query("SELECT * FROM businesses WHERE id = $1", [id]);
    const biz = rows[0] || null;
    if (!biz) return null;
    const { rows: srows } = await query("SELECT * FROM business_settings WHERE business_id = $1", [biz.id]);
    return mapBusiness(biz, srows[0]);
  },

  async loginBusiness({ businessName, businessEmail, token }) {
    if (!getPool()) return null;

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
    if (!getPool()) return null;

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
    if (!getPool()) return [];

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
    if (!getPool()) return null;
    const { rows } = await query("SELECT * FROM products WHERE id = $1", [id]);
    return mapProduct(rows[0] || null);
  },

  async createProduct({ name, category, unitPrice, stockQty = 0, businessId }) {
    if (!getPool()) return null;

    let targetBizId = businessId;
    if (!targetBizId) {
      const biz = await this.getBusiness();
      targetBizId = biz?.id;
    }

    const { rows } = await query(
      `INSERT INTO products (business_id, name, category, unit_price, stock_qty)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [targetBizId, name, category, Number(unitPrice), Number(stockQty)]
    );
    return mapProduct(rows[0]);
  },

  async updateProduct(id, updates) {
    if (!getPool()) return null;

    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.unitPrice !== undefined) payload.unit_price = Number(updates.unitPrice);
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
    if (!getPool()) return false;
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
      totalStockValue += p.unitPrice * p.stockQty;
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
    if (!getPool()) return [];

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
    if (!getPool()) return null;
    const { rows } = await query("SELECT * FROM records WHERE id = $1", [id]);
    return mapRecord(rows[0] || null);
  },

  async createRecord({
    productId,
    productName,
    quantity,
    unitPrice,
    timestamp,
    source = "manual",
    status = "saved",
    scanId = null,
    businessId,
  }) {
    if (!getPool()) return null;

    let targetBizId = businessId;
    if (!targetBizId) {
      const biz = await this.getBusiness();
      targetBizId = biz?.id;
    }

    const qty = Number(quantity);
    const price = Number(unitPrice);
    const amount = qty * price;

    const { rows } = await query(
      `INSERT INTO records (business_id, product_id, product_name, quantity, unit_price, amount, timestamp, source, status, scan_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        targetBizId,
        productId || null,
        productName,
        qty,
        price,
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
    if (!getPool()) return null;

    const payload = {};
    if (updates.productName !== undefined) payload.product_name = updates.productName;
    if (updates.quantity !== undefined) payload.quantity = Number(updates.quantity);
    if (updates.unitPrice !== undefined) payload.unit_price = Number(updates.unitPrice);
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
    if (!getPool()) return null;

    let targetBizId = businessId;
    if (!targetBizId) {
      const biz = await this.getBusiness();
      targetBizId = biz?.id;
    }

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
    if (!getPool()) return [];

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
    if (!getPool()) return null;

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
    if (!getPool()) return false;
    const { rowCount } = await query("DELETE FROM scans WHERE id = $1", [id]);
    return rowCount > 0;
  },

  async updateExtractedRow(scanId, rowId, updates) {
    if (!getPool()) return null;

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

    const biz = await this.getBusiness();
    const defaultBizId = biz?.id;

    // Fetch current products to match unknown items
    let currentProducts = [];
    try {
      currentProducts = await this.listProducts({ businessId: defaultBizId });
    } catch (e) { /* ignore */ }

    // Helper to find or create product, and restock matched products
    async function findOrCreateProduct(row) {
      const match = currentProducts.find(
        (p) => String(p.name).toLowerCase() === String(row.productName || row.product_name || "").toLowerCase()
      );
      if (match) {
        // Sales reduce stock
        const current = await dbService.getProduct(match.id);
        const newStock = Math.max(0, (current?.stockQty || 0) - Number(row.quantity || 1));
        await dbService.updateProduct(match.id, { stockQty: newStock });
        return match.id;
      }
      // Create new product for unknown/unmatched items
      const newProd = await dbService.createProduct({
        name: row.productName || row.product_name || "Unknown item",
        category: "Other",
        unitPrice: Number(row.unitPrice || row.unit_price || 0),
        stockQty: 0,
        businessId: defaultBizId,
      });
      return newProd ? newProd.id : null;
    }

    const recordsToInsert = [];
    const confirmedAt = new Date();
    for (const row of scan.extracted || []) {
      const productId = await findOrCreateProduct(row);
      recordsToInsert.push([
        defaultBizId,
        productId,
        row.productName || row.product_name,
        Number(row.quantity || 1),
        Number(row.unitPrice || row.unit_price || 0),
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
          const b = vals.length - 10;
          return `(${Array.from({ length: 10 }, (_, i) => `$${b + i + 1}`).join(", ")})`;
        });
        await client.query(
          `INSERT INTO records (business_id, product_id, product_name, quantity, unit_price, amount, timestamp, source, status, scan_id)
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
      estimatedProfit: Math.round(salesToday * config.profitMargin),
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
    const estimatedProfit = Math.round(totalSales * config.profitMargin);

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
    if (!getPool()) return;
    const biz = businessId ? null : await this.getBusiness();
    const targetBizId = businessId || biz?.id;
    if (!targetBizId) return;

    await query(
      "DELETE FROM scan_extracted_items WHERE scan_id IN (SELECT id FROM scans WHERE business_id = $1)",
      [targetBizId]
    );
    await query("DELETE FROM records WHERE business_id = $1", [targetBizId]);
    await query("DELETE FROM scans WHERE business_id = $1", [targetBizId]);
    await query("DELETE FROM products WHERE business_id = $1", [targetBizId]);
  },
};
