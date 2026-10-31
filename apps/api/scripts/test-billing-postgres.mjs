import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Deliberately avoid falling back to DATABASE_URL: acceptance tests must target
// a database the caller explicitly selected for testing.
const databaseUrl = process.env.BILLING_TEST_DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error(
    "BILLING_TEST_DATABASE_URL is required. Use a disposable PostgreSQL database with schema creation permission.",
  );
  process.exit(1);
}
try {
  const protocol = new URL(databaseUrl).protocol;
  if (protocol !== "postgres:" && protocol !== "postgresql:") throw new Error();
} catch {
  console.error(
    "BILLING_TEST_DATABASE_URL must be a PostgreSQL connection URL.",
  );
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [
    fileURLToPath(import.meta.resolve("vitest/vitest.mjs")),
    "run",
    "src/modules/billing/test/billing.postgres.test.ts",
    "--maxWorkers=1",
    "--minWorkers=1",
  ],
  {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: { ...process.env, BILLING_TEST_DATABASE_URL: databaseUrl },
    stdio: "inherit",
  },
);
if (result.error)
  console.error(
    "Could not start the billing PostgreSQL test runner:",
    result.error.message,
  );
process.exit(result.status ?? 1);
