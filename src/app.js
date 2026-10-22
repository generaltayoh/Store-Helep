import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import { tokenAuth, requireBusiness } from "./middleware/tokenAuth.js";
import businessRoutes from "./routes/business.js";
import scanRoutes from "./routes/scan.js";
import recordRoutes from "./routes/record.js";
import productRoutes from "./routes/product.js";
import dashboardRoutes from "./routes/dashboard.js";
import analyticsRoutes from "./routes/analytics.js";
import exportRoutes from "./routes/export.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

export const app = express();

app.use(cors());
app.use(express.json());

// Compatibility: older cached frontends may still call "/api/api/..." because
// API_BASE already includes "/api". Normalise those paths instead of 404ing.
app.use((req, _res, next) => {
  if (req.url.startsWith("/api/api/")) req.url = req.url.slice(4);
  next();
});

// API routes (mounted before static so they take precedence).
app.use("/api/auth", authRoutes);
app.use(tokenAuth);
app.use("/api/business", requireBusiness, businessRoutes);
app.use("/api/scans", requireBusiness, scanRoutes);
app.use("/api/records", requireBusiness, recordRoutes);
app.use("/api/products", requireBusiness, productRoutes);
app.use("/api/dashboard", requireBusiness, dashboardRoutes);
app.use("/api/analytics", requireBusiness, analyticsRoutes);
app.use("/api/export", requireBusiness, exportRoutes);

// Serve the existing static frontend.
app.use(express.static(projectRoot));

import { dbService } from "./services/dbService.js";

app.post("/api/clear", async (req, res) => {
  try {
    if (!req.businessId) {
      return res.status(401).json({ error: "Please log in to clear your data." });
    }
    await dbService.clearAllData(req.businessId);
    res.json({ cleared: true });
  } catch (e) {
    console.error("[clear] Database clear failed:", e.message);
    res.status(503).json({ error: "Could not clear the database." });
  }
});

// Health check.
app.get("/api/health", (_req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

// 404 for unknown API routes.
app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));

// Central error handler (keeps status codes from thrown errors).
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || "Internal server error." });
});
