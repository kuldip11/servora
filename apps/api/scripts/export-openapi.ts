import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Schema generation must not depend on developer/CI secrets or live infrastructure.
process.env["NODE_ENV"] = "test";
process.env["DATABASE_URL"] ??=
  "postgres://servora:servora@127.0.0.1:5432/servora_contracts";
process.env["REDIS_URL"] ??= "redis://127.0.0.1:6379";
process.env["JWT_SECRET"] ??= "servora-contract-generation-secret";
process.env["METRICS_TOKEN"] ??= "servora-contract-generation-metrics-token";

const { app } = await import("../src/index");

const checkOnly = process.argv.includes("--check");
const output = resolve(process.cwd(), "../../.cache/openapi.json");

const response = await app.handle(new Request("http://localhost/swagger/json"));
if (!response.ok) {
  throw new Error(`Failed to generate OpenAPI schema (${response.status})`);
}

const spec = await response.json();
const serialized = `${JSON.stringify(spec, null, 2)}\n`;

await mkdir(resolve(process.cwd(), "../../.cache"), { recursive: true });

if (checkOnly) {
  let current = "";
  try {
    current = await readFile(output, "utf8");
  } catch {
    // handled by mismatch below
  }
  if (current !== serialized) {
    console.error(".cache/openapi.json is stale. Regenerate the API contract.");
    process.exitCode = 1;
  } else {
    console.log("OpenAPI schema is current.");
  }
} else {
  await writeFile(output, serialized);
  console.log(`Generated OpenAPI schema -> ${output}`);
}
