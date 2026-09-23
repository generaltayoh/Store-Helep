import { getSupabaseClient, isSupabaseConfigured } from "../config/supabase.js";
import { config } from "../config/index.js";
import { stockStatus, withStatus } from "./inventoryService.js";
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
    sku: p.sku,
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

// Map scan row and extracted items
function mapScan(scan, items = []) {
  if (!scan) return null;
  const extracted = (items || []).map((i) => ({
    id: i.id,
    productName: i.product_name,
    quantity: Number(i.quantity || 1),
    unitPrice: Number(i.unit_price || 0),
    date: new Date(i.date || scan.created_at),
    confidence: Number(i.confidence || 0.9),
  }));

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
    status: scan.status,
    recordCount: extracted.length,
    extracted,
    needsReview,
  };
}

export const supabaseService = {
  // --------------------------------------------------------------------------
  // Business & Settings
  // --------------------------------------------------------------------------
  async getBusiness() {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (bizErr) throw bizErr;
    if (!biz) return null;

    const { data: settings } = await supabase
      .from("business_settings")
      .select("*")
      .eq("business_id", biz.id)
      .maybeSingle();

    return mapBusiness(biz, settings);
  },

  async findBusinessByNameAndPhone(name, phone) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    const { data: biz, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("name", name)
      .eq("email", phone)
      .maybeSingle();
    if (error) throw error;
    if (!biz) return null;
    const { data: settings } = await supabase
      .from("business_settings")
      .select("*")
      .eq("business_id", biz.id)
      .maybeSingle();
    return mapBusiness(biz, settings);
  },

  async findByName(name) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    const { data: biz, error } = await supabase.from("businesses").select("*").eq("name", name).maybeSingle();
    if (error) throw error;
    return biz || null;
  },

  async findByPhone(phone) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    const { data: biz, error } = await supabase.from("businesses").select("*").eq("email", phone).maybeSingle();
    if (error) throw error;
    return biz || null;
  },

  async getBusinessById(id) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data: biz, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!biz) return null;

    const { data: settings } = await supabase
      .from("business_settings")
      .select("*")
      .eq("business_id", biz.id)
      .maybeSingle();

    return mapBusiness(biz, settings);
  },

  async loginBusiness({ businessName, businessEmail, token }) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    // Check if business exists by email
    const { data: existing } = await supabase
      .from("businesses")
      .select("*")
      .eq("email", businessEmail)
      .maybeSingle();

    let bizRecord = existing;

    if (!bizRecord) {
      const { data: created, error } = await supabase
        .from("businesses")
        .insert({
          name: businessName,
          email: businessEmail,
          token,
          type: "Grocery / Mini-market",
          currency: "FCFA",
          record_method: "Notebook",
        })
        .select()
        .single();
      if (error) throw error;
      bizRecord = created;

      await supabase.from("business_settings").insert({
        business_id: bizRecord.id,
        language: "en",
        dark_mode: false,
      });
    } else {
      const { data: updated, error } = await supabase
        .from("businesses")
        .update({ name: businessName, token })
        .eq("id", bizRecord.id)
        .select()
        .single();
      if (error) throw error;
      bizRecord = updated;
    }

    const { data: settings } = await supabase
      .from("business_settings")
      .select("*")
      .eq("business_id", bizRecord.id)
      .maybeSingle();

    return mapBusiness(bizRecord, settings);
  },

  async updateBusiness(id, updates) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const bizUpdates = {};
    if (updates.name !== undefined) bizUpdates.name = updates.name;
    if (updates.email !== undefined) bizUpdates.email = updates.email;
    if (updates.type !== undefined) bizUpdates.type = updates.type;
    if (updates.currency !== undefined) bizUpdates.currency = updates.currency;
    if (updates.location !== undefined) bizUpdates.location = updates.location;
    if (updates.recordMethod !== undefined) bizUpdates.record_method = updates.recordMethod;
    if (updates.token !== undefined) bizUpdates.token = updates.token;

    let bizRecord = null;
    if (Object.keys(bizUpdates).length > 0) {
      const { data, error } = await supabase
        .from("businesses")
        .update(bizUpdates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      bizRecord = data;
    } else {
      const { data } = await supabase.from("businesses").select("*").eq("id", id).single();
      bizRecord = data;
    }

    const settingsUpdates = {};
    if (updates.language !== undefined) settingsUpdates.language = updates.language;
    if (updates.darkMode !== undefined) settingsUpdates.dark_mode = Boolean(updates.darkMode);

    let settingsRecord = null;
    if (Object.keys(settingsUpdates).length > 0) {
      const { data, error } = await supabase
        .from("business_settings")
        .upsert({ business_id: id, ...settingsUpdates }, { onConflict: "business_id" })
        .select()
        .single();
      if (error) throw error;
      settingsRecord = data;
    } else {
      const { data } = await supabase
        .from("business_settings")
        .select("*")
        .eq("business_id", id)
        .maybeSingle();
      settingsRecord = data;
    }

    return mapBusiness(bizRecord, settingsRecord);
  },

  // --------------------------------------------------------------------------
  // Products / Inventory
  // --------------------------------------------------------------------------
  async listProducts({ category, stockStatus: statusFilter, businessId } = {}) {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    let query = supabase.from("products").select("*").order("name", { ascending: true });
    if (businessId) query = query.eq("business_id", businessId);
    if (category) query = query.eq("category", category);

    const { data, error } = await query;
    if (error) throw error;

    let products = (data || []).map(mapProduct);
    if (statusFilter && statusFilter !== "all") {
      products = products.filter((p) => p.stockStatus === statusFilter);
    }
    return products;
  },

  async getProduct(id) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return mapProduct(data);
  },

  async createProduct({ sku, name, category, unitPrice, stockQty = 0, businessId }) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    // Get default business ID if not supplied
    let targetBizId = businessId;
    if (!targetBizId) {
      const biz = await this.getBusiness();
      targetBizId = biz?.id;
    }

    const { data, error } = await supabase
      .from("products")
      .insert({
        business_id: targetBizId,
        sku,
        name,
        category,
        unit_price: Number(unitPrice),
        stock_qty: Number(stockQty),
      })
      .select()
      .single();

    if (error) throw error;
    return mapProduct(data);
  },

  async updateProduct(id, updates) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.unitPrice !== undefined) payload.unit_price = Number(updates.unitPrice);
    if (updates.stockQty !== undefined) payload.stock_qty = Number(updates.stockQty);

    const { data, error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return mapProduct(data);
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
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    let query = supabase.from("records").select("*").order("timestamp", { ascending: false });
    if (businessId) query = query.eq("business_id", businessId);

    if (filter === "needs_review") {
      query = query.eq("status", "needs_review");
    } else if (["today", "this_week", "this_month", "custom"].includes(filter)) {
      const { from: f, to: t } = resolveRange(filter, from, to);
      query = query
        .gte("timestamp", new Date(f).toISOString())
        .lte("timestamp", new Date(t).toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(mapRecord);
  },

  async getRecord(id) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("records")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return mapRecord(data);
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
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    let targetBizId = businessId;
    if (!targetBizId) {
      const biz = await this.getBusiness();
      targetBizId = biz?.id;
    }

    const qty = Number(quantity);
    const price = Number(unitPrice);
    const amount = qty * price;

    const { data, error } = await supabase
      .from("records")
      .insert({
        business_id: targetBizId,
        product_id: productId || null,
        product_name: productName,
        quantity: qty,
        unit_price: price,
        amount,
        timestamp: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
        source,
        status,
        scan_id: scanId,
      })
      .select()
      .single();

    if (error) throw error;
    return mapRecord(data);
  },

  async updateRecord(id, updates) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

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

    const { data, error } = await supabase
      .from("records")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return mapRecord(data);
  },

  // --------------------------------------------------------------------------
  // Scans & Extracted Items
  // --------------------------------------------------------------------------
  async createScan({ fileName, imageUrl = null, extracted = [], businessId }) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    let targetBizId = businessId;
    if (!targetBizId) {
      const biz = await this.getBusiness();
      targetBizId = biz?.id;
    }

    const { data: scan, error: scanErr } = await supabase
      .from("scans")
      .insert({
        business_id: targetBizId,
        file_name: fileName,
        image_url: imageUrl,
        status: "needs_review",
      })
      .select()
      .single();

    if (scanErr) throw scanErr;

    const itemsToInsert = extracted.map((row) => ({
      scan_id: scan.id,
      product_name: row.productName,
      quantity: row.quantity || 1,
      unit_price: row.unitPrice || 0,
      date: row.date ? new Date(row.date).toISOString() : new Date().toISOString(),
      confidence: row.confidence || 0.9,
    }));

    let insertedItems = [];
    if (itemsToInsert.length > 0) {
      const { data: items, error: itemsErr } = await supabase
        .from("scan_extracted_items")
        .insert(itemsToInsert)
        .select();
      if (itemsErr) throw itemsErr;
      insertedItems = items;
    }

    return mapScan(scan, insertedItems);
  },

  async listScans(businessId) {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    let query = supabase.from("scans").select("*").order("created_at", { ascending: false });
    if (businessId) query = query.eq("business_id", businessId);

    const { data: scans, error } = await query;
    if (error) throw error;
    if (!scans || scans.length === 0) return [];

    const scanIds = scans.map((s) => s.id);
    const { data: items } = await supabase
      .from("scan_extracted_items")
      .select("*")
      .in("scan_id", scanIds);

    const itemsByScanId = new Map();
    for (const item of items || []) {
      if (!itemsByScanId.has(item.scan_id)) itemsByScanId.set(item.scan_id, []);
      itemsByScanId.get(item.scan_id).push(item);
    }

    return scans.map((s) => mapScan(s, itemsByScanId.get(s.id) || []));
  },

  async getScan(id) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data: scan, error } = await supabase
      .from("scans")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!scan) return null;

    const { data: items } = await supabase
      .from("scan_extracted_items")
      .select("*")
      .eq("scan_id", id);

    return mapScan(scan, items || []);
  },

  async updateExtractedRow(scanId, rowId, updates) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const payload = {};
    if (updates.productName !== undefined) payload.product_name = updates.productName;
    if (updates.quantity !== undefined) payload.quantity = Number(updates.quantity);
    if (updates.unitPrice !== undefined) payload.unit_price = Number(updates.unitPrice);
    if (updates.date !== undefined) payload.date = new Date(updates.date).toISOString();

    if (payload.product_name && payload.product_name !== "Unknown item" && payload.unit_price > 0) {
      payload.confidence = 0.95;
    }

    const { error } = await supabase
      .from("scan_extracted_items")
      .update(payload)
      .eq("id", rowId)
      .eq("scan_id", scanId);

    if (error) throw error;
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

    const supabase = getSupabaseClient();
    const recordsToInsert = scan.extracted.map((row) => ({
      business_id: (scan.business_id) || (undefined),
      product_id: null,
      product_name: row.productName,
      quantity: row.quantity,
      unit_price: row.unitPrice,
      amount: row.quantity * row.unitPrice,
      timestamp: scan.createdAt.toISOString(),
      source: "scanned",
      status: "saved",
      scan_id: scan.id,
    }));

    // If business_id is needed, fetch default business
    const biz = await this.getBusiness();
    const defaultBizId = biz?.id;
    for (const r of recordsToInsert) {
      if (!r.business_id) r.business_id = defaultBizId;
    }

    if (recordsToInsert.length > 0) {
      const { error: insErr } = await supabase.from("records").insert(recordsToInsert);
      if (insErr) throw insErr;
    }

    const { error: updErr } = await supabase
      .from("scans")
      .update({ status: "saved" })
      .eq("id", scanId);
    if (updErr) throw updErr;

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
};
