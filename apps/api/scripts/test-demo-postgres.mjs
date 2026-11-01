import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
// Never fall back to the application's DATABASE_URL.
const databaseUrl = process.env.DEMO_TEST_DATABASE_URL?.trim();
try {
  if (
    !databaseUrl ||
    !["postgres:", "postgresql:"].includes(new URL(databaseUrl).protocol)
  )
    throw new Error();
} catch {
  console.error(
    "DEMO_TEST_DATABASE_URL must explicitly select a disposable PostgreSQL test database. Tests create and remove an isolated schema.",
  );
  process.exit(1);
}
const result = spawnSync(
  process.execPath,
  [
    fileURLToPath(import.meta.resolve("vitest/vitest.mjs")),
    "run",
    "src/db/seed/demo/config.test.ts",
    "src/db/seed/demo/seed.postgres.test.ts",
    "--pool=threads",
    "--poolOptions.threads.singleThread",
  ],
  {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: { ...process.env, DEMO_TEST_DATABASE_URL: databaseUrl },
    stdio: "inherit",
  },
);
if (result.error)
  console.error("Could not start demo tests:", result.error.message);
process.exit(result.status ?? 1);
