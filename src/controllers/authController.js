import { randomUUID } from "crypto";
import { db, nextId } from "../data/store.js";
import { isPhone } from "../middleware/validate.js";
import { isDbConfigured } from "../config/db.js";
import { dbService } from "../services/dbService.js";

function publicBusiness() {
  if (!db.business) return null;
  return { ...db.business, settings: { ...db.settings } };
}

// Login by shop name + email (no password, per requirements).
export async function login(req, res, next) {
  try {
    const { businessName, businessPhone } = req.body;
    if (!businessName || !businessPhone) {
      return res.status(400).json({ error: "businessName and businessPhone are required." });
    }
    if (!isPhone(businessPhone)) {
      return res.status(400).json({ error: "Invalid business phone." });
    }

    const token = randomUUID();

    if (isDbConfigured()) {
      const biz = await dbService.findBusinessByNameAndPhone(businessName, businessPhone);
      if (!biz) {
        return res.status(401).json({ error: "Business not found. Check your name and phone number." });
      }
      // Keep the existing session token so other logged-in devices stay valid;
      // only issue a new one if the business has no token yet.
      const activeToken = biz.token || token;
      const updated = await dbService.updateBusiness(biz.id, {
        email: businessPhone,
        token: activeToken,
      });
      return res.json({ token: activeToken, business: updated });
    }

    let biz = db.business;
    if (biz && (biz.name !== businessName || biz.email !== businessPhone)) {
      return res.status(401).json({ error: "Business not found. Check your name and phone number." });
    }
    if (!biz) {
      return res.status(401).json({ error: "Business not found. Check your name and phone number." });
    }
    biz.name = businessName;
    biz.email = businessPhone;
    biz.token = token;
    res.json({ token: biz.token, business: publicBusiness() });
  } catch (err) {
    next(err);
  }
}

// Onboarding shop setup.
export async function setup(req, res, next) {
  try {
    const { name, phone, type, currency, location, recordMethod } = req.body;
    if (phone && !isPhone(phone)) {
      return res.status(400).json({ error: "Invalid business phone." });
    }

    if (isDbConfigured()) {
      const byName = await dbService.findByName(name);
      const byPhone = await dbService.findByPhone(phone);
      if (byName && byPhone) {
        return res.status(409).json({ error: "This business name and phone are already registered." });
      } else if (byName) {
        return res.status(409).json({ error: "This business name is already registered." });
      } else if (byPhone) {
        return res.status(409).json({ error: "This business phone is already registered." });
      }
      const biz = await dbService.loginBusiness({
        businessName: name || "Mama General Store",
        businessEmail: phone || "+1234567890",
        token: randomUUID(),
      });
      const updated = await dbService.updateBusiness(biz.id, {
        name,
        email: phone,
        type,
        currency: "FCFA",
        location,
        recordMethod,
        token: biz.token,
      });
      return res.json({ business: updated });
    }

    if (db.business) {
      const nameMatch = db.business.name === name;
      const phoneMatch = db.business.email === phone;
      if (nameMatch && phoneMatch) {
        return res.status(409).json({ error: "This business name and phone are already registered." });
      } else if (nameMatch) {
        return res.status(409).json({ error: "This business name is already registered." });
      } else if (phoneMatch) {
        return res.status(409).json({ error: "This business phone is already registered." });
      }
    }

    if (!db.business) {
      db.business = {
        id: nextId("biz"),
        createdAt: new Date(),
      };
    }
    Object.assign(db.business, {
      name: name || db.business.name,
      email: phone || db.business.email,
      type: type || db.business.type || "Grocery / Mini-market",
      currency: "FCFA",
      location: location !== undefined ? location : db.business.location || "",
      recordMethod: recordMethod || db.business.recordMethod || "Notebook",
    });
    db.business.token = db.business.token || randomUUID();
    res.json({ business: publicBusiness() });
  } catch (err) {
    next(err);
  }
}

export async function setRecordMethod(req, res, next) {
  try {
    const { method } = req.body;
    const allowed = ["Notebook", "Receipts", "Spreadsheet", "Other"];
    if (!allowed.includes(method)) {
      return res.status(400).json({ error: "Invalid record method." });
    }

    if (isDbConfigured()) {
      const biz = await dbService.getBusiness();
      if (!biz) {
        return res.status(400).json({ error: "Business not set up yet." });
      }
      const updated = await dbService.updateBusiness(biz.id, { recordMethod: method });
      return res.json({ business: updated });
    }

    if (!db.business) {
      return res.status(400).json({ error: "Business not set up yet." });
    }
    db.business.recordMethod = method;
    res.json({ business: publicBusiness() });
  } catch (err) {
    next(err);
  }
}
