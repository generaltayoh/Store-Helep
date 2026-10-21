import { randomUUID } from "crypto";
import { isPhone } from "../middleware/validate.js";
import { dbService } from "../services/dbService.js";

// Login by shop name + phone (no password, per requirements).
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
    res.json({ token: activeToken, business: updated });
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
    res.json({ business: updated });
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

    const biz = await dbService.getBusiness(req.businessId);
    if (!biz) {
      return res.status(400).json({ error: "Business not set up yet." });
    }
    const updated = await dbService.updateBusiness(biz.id, { recordMethod: method });
    res.json({ business: updated });
  } catch (err) {
    next(err);
  }
}
