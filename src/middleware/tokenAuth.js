import { isDbConfigured } from "../config/db.js";
import { dbService } from "../services/dbService.js";
import { db } from "../data/store.js";

export async function tokenAuth(req, _res, next) {
  let token = req.headers.token || req.headers.authorization || null;
  if (token && typeof token === "string" && token.toLowerCase().startsWith("bearer ")) {
    token = token.slice(7).trim();
  }

  if (!token) {
    return next(); // Allow public routes (health, etc.)
  }

  if (isDbConfigured()) {
    try {
      const biz = await dbService.findBusinessByToken(token);
      if (!biz) {
        const err = new Error("Invalid or expired token. Access denied.");
        err.status = 401;
        return next(err);
      }
      req.business = biz;
      req.businessId = biz.id;
    } catch (e) {
      return next(e);
    }
  } else {
    // Mock mode: verify against global db (still single-tenant mock)
    if (!db.business || db.business.token !== token) {
      const err = new Error("Invalid or expired token. Access denied.");
      err.status = 401;
      return next(err);
    }
    req.business = db.business;
    req.businessId = db.business.id;
  }

  next();
}
