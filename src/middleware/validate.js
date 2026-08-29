// Lightweight request validation helpers used by controllers.

export function requiredBody(fields) {
  return (req, _res, next) => {
    const missing = fields.filter((f) => req.body[f] === undefined || req.body[f] === "");
    if (missing.length) {
      const err = new Error(`Missing required field(s): ${missing.join(", ")}`);
      err.status = 400;
      return next(err);
    }
    next();
  };
}

export function isEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
