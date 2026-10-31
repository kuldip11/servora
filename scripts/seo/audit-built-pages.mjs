import { spawnSync } from "node:child_process";
const result = spawnSync(
  "python3",
  ["scripts/seo/audit-built-pages.py", ...process.argv.slice(2)],
  { stdio: "inherit" },
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
