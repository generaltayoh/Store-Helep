import { isSupabaseConfigured } from "../config/supabase.js";
import { getSupabaseClient } from "../config/supabase.js";
import { db } from "../data/store.js";

export async function tokenAuth(req, _res, next) {
  let token = req.headers.token || req.headers.authorization || null;
  if (token && typeof token === "string" && token.toLowerCase().startsWith("bearer ")) {
    token = token.slice(7).trim();
  }

  if (!token) {
    return next(); // Allow public routes (health, etc.)
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: biz } = await supabase
          .from("businesses")
          .select("id, name, email, token, type, currency, location, record_method, created_at, updated_at")
          .eq("token", token)
          .maybeSingle();
        if (!biz) {
          const err = new Error("Invalid or expired token. Access denied.");
          err.status = 401;
          return next(err);
        }
        req.business = biz;
        req.businessId = biz.id;
      } else {
        const err = new Error("Supabase not configured.");
        err.status = 503;
        return next(err);
      }
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
