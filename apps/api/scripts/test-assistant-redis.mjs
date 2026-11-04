import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const url = process.env.ASSISTANT_TEST_REDIS_URL?.trim();
try {
  if (!url || !["redis:", "rediss:"].includes(new URL(url).protocol))
    throw new Error();
} catch {
  console.error(
    "ASSISTANT_TEST_REDIS_URL must explicitly select a disposable Redis instance. The test never falls back to REDIS_URL.",
  );
  process.exit(1);
}
const result = spawnSync(
  process.execPath,
  [
    fileURLToPath(import.meta.resolve("vitest/vitest.mjs")),
    "run",
    "src/modules/assistant/test/assistant.redis.test.ts",
    "--pool=threads",
    "--poolOptions.threads.singleThread",
  ],
  {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: { ...process.env, ASSISTANT_TEST_REDIS_URL: url },
    stdio: "inherit",
  },
);
if (result.error)
  console.error("Could not start assistant Redis tests:", result.error.message);
process.exit(result.status ?? 1);
