import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
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

// API routes (mounted before static so they take precedence).
app.use("/api/auth", authRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/scans", scanRoutes);
app.use("/api/records", recordRoutes);
app.use("/api/products", productRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/export", exportRoutes);

// Serve the existing static frontend.
app.use(express.static(projectRoot));

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
