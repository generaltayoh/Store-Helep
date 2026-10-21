import { app } from "./src/app.js";
import { config } from "./src/config/index.js";
import { ensureSchema } from "./src/services/schemaService.js";

// Bring the database schema up to date (idempotent, no data loss).
ensureSchema()
  .then((ok) => {
    if (ok) console.log("Database schema is up to date.");
  })
  .catch((e) => {
    console.error("Schema check failed:", e.message);
  });

app.listen(config.port, () => {
  console.log(`Store Helep API listening on http://localhost:${config.port}`);
  console.log(`Serving frontend from project root, API under /api`);
});
