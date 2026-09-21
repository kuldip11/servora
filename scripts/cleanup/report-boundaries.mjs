import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const roots = ["apps", "packages"];
const findings = [];
const importPattern = /(?:from\s+|import\s*)["']([^"']+)["']/g;

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
  if (
    /\.(?:test|spec)\.[^.]+$/.test(path) ||
    /[/\\](?:test|tests|__tests__)[/\\]/.test(path)
  )
    return;
  const source = await readFile(path, "utf8");
  const file = relative(process.cwd(), path).replaceAll("\\", "/");
  const currentFeature = file.match(
    /^apps\/[^/]+\/src\/features\/([^/]+)/,
  )?.[1];
  if (!currentFeature) return;

  for (const match of source.matchAll(importPattern)) {
    const target = match[1];
    const targetFeature = target.match(
      /^@\/features\/([^/]+)\/(?:components|hooks|pages|internal)\//,
    )?.[1];
    if (targetFeature && targetFeature !== currentFeature) {
      findings.push(
        `${file}: deep feature-internal import from ${targetFeature}: ${target}`,
      );
    }
  }
}

for (const root of roots) await walk(root);

if (!findings.length)
  console.log("No cross-feature internal imports detected by cleanup audit.");
else {
  console.error(
    "Cross-feature internal imports are forbidden; import from the feature public entry point instead:",
  );
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}
