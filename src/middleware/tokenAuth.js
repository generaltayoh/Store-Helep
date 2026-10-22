import { dbService } from "../services/dbService.js";

export async function tokenAuth(req, _res, next) {
  let token = req.headers.token || req.headers.authorization || null;
  if (token && typeof token === "string" && token.toLowerCase().startsWith("bearer ")) {
    token = token.slice(7).trim();
  }

  if (!token) {
    return next(); // Allow public routes (health, etc.)
  }

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

  next();
}

// Routes that read or write business data must have a valid session token.
export function requireBusiness(req, res, next) {
  if (!req.businessId) {
    return res.status(401).json({ error: "Please log in to continue." });
  }
  next();
}
