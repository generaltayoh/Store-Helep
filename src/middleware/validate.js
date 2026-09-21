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

export function isPhone(value) {
  // Cameroonian standard: +237 6/7/8/9 followed by 8 digits, or 237/6/7/8/9 with digits
  return typeof value === "string" && /^(\+237|237)?[6789]\d{8}$/.test(value.replace(/\s/g, ""));
}
