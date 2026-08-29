import { randomUUID } from "crypto";
import { db, nextId } from "../data/store.js";
import { isEmail } from "../middleware/validate.js";

function publicBusiness() {
  if (!db.business) return null;
  return { ...db.business, settings: { ...db.settings } };
}

// Login by shop name + email (no password, per requirements).
export function login(req, res) {
  const { businessName, businessEmail } = req.body;
  if (!businessName || !businessEmail) {
    return res.status(400).json({ error: "businessName and businessEmail are required." });
  }
  if (!isEmail(businessEmail)) {
    return res.status(400).json({ error: "Invalid business email." });
  }

  let biz = db.business;
  if (!biz) {
    biz = {
      id: nextId("biz"),
      name: businessName,
      email: businessEmail,
      type: "Grocery / Mini-market",
      currency: "FCFA",
      location: "",
      recordMethod: "Notebook",
      createdAt: new Date(),
    };
    db.business = biz;
  } else {
    biz.name = businessName;
    biz.email = businessEmail;
  }
  biz.token = randomUUID();
  res.json({ token: biz.token, business: publicBusiness() });
}

// Onboarding shop setup.
export function setup(req, res) {
  const { name, email, type, currency, location, recordMethod } = req.body;
  if (email && !isEmail(email)) {
    return res.status(400).json({ error: "Invalid business email." });
  }
  if (!db.business) {
    db.business = {
      id: nextId("biz"),
      createdAt: new Date(),
    };
  }
  Object.assign(db.business, {
    name: name || db.business.name,
    email: email || db.business.email,
    type: type || db.business.type || "Grocery / Mini-market",
    currency: currency || db.business.currency || "FCFA",
    location: location !== undefined ? location : db.business.location || "",
    recordMethod: recordMethod || db.business.recordMethod || "Notebook",
  });
  db.business.token = db.business.token || randomUUID();
  res.json({ business: publicBusiness() });
}

export function setRecordMethod(req, res) {
  const { method } = req.body;
  const allowed = ["Notebook", "Receipts", "Spreadsheet", "Other"];
  if (!allowed.includes(method)) {
    return res.status(400).json({ error: "Invalid record method." });
  }
  if (!db.business) {
    return res.status(400).json({ error: "Business not set up yet." });
  }
  db.business.recordMethod = method;
  res.json({ business: publicBusiness() });
}
