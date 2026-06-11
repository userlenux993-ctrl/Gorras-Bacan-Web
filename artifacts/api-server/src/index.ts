import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "@workspace/db";
import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Run DB migrations on every startup — idempotent, skips already-applied ones.
// Ensures the production database always has the latest schema without manual steps.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// dist/index.mjs → ../../../lib/db/migrations = lib/db/migrations at repo root
const migrationsFolder = path.resolve(__dirname, "../../../lib/db/migrations");

try {
  await migrate(db, { migrationsFolder });
  logger.info("Database migrations applied");
} catch (err) {
  logger.error({ err }, "Failed to apply database migrations");
  process.exit(1);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
