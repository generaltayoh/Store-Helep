import { app } from "./src/app.js";
import { config } from "./src/config/index.js";
import { seed } from "./src/data/seed.js";

// Optional: Only seed mock data if explicitly requested via SEED_ON_START=true
if (process.env.SEED_ON_START === "true") {
  seed();
}

app.listen(config.port, () => {
  console.log(`Store Helep API listening on http://localhost:${config.port}`);
  console.log(`Serving frontend from project root, API under /api`);
});
