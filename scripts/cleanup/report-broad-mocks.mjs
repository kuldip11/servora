import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const roots = ["apps", "packages"];
const targets = new Map([
  ["@pos/ui", { maxFullMocks: 130 }],
  ["@tanstack/react-query", { maxFullMocks: 55 }],
]);
const findings = new Map(
  [...targets.keys()].map((target) => [target, { full: [], partial: [] }]),
);

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (
      [
        "node_modules",
        "dist",
        "coverage",
        ".turbo",
        ".next",
        "generated",
      ].includes(entry.name)
    )
      continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if ([".ts", ".tsx"].includes(extname(entry.name))) await inspect(path);
  }
}

async function inspect(path) {
  const source = await readFile(path, "utf8");
  for (const target of targets.keys()) {
    const escaped = target.replaceAll("/", "\\/");
    const pattern = new RegExp(`vi\\.mock\\([\"']${escaped}[\"']`);
    if (!pattern.test(source)) continue;
    const bucket =
      source.includes(`vi.importActual<typeof import("${target}")>`) ||
      source.includes(`vi.importActual<typeof import('${target}')>`)
        ? "partial"
        : "full";
    findings.get(target)[bucket].push(relative(process.cwd(), path));
  }
}

for (const root of roots) await walk(root);

let failed = false;
console.log(
  "Broad test-mock inventory (full-module mocks are capped; prefer partial/real modules when touching tests):",
);
for (const [target, { maxFullMocks }] of targets) {
  const { full, partial } = findings.get(target);
  console.log(
    `- ${target}: ${full.length} full, ${partial.length} partial (max full: ${maxFullMocks})`,
  );
  if (full.length > maxFullMocks) {
    failed = true;
    console.error(
      `  Full-module mock count increased by ${full.length - maxFullMocks}. Convert new/touched tests to real or partial mocks.`,
    );
  }
}
if (failed) process.exit(1);
