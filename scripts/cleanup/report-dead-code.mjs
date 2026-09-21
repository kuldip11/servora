import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve, dirname, basename } from "node:path";
import { existsSync } from "node:fs";

const roots = [
  "apps/web/src/features",
  "apps/waiter-app/src/features",
  "apps/kitchen-display/src/features",
  "apps/customer-app/src/features",
  "packages/ui/src/components",
];
const extensions = [".ts", ".tsx"];
const ignoredDirs = new Set([
  "node_modules",
  "dist",
  "coverage",
  ".turbo",
  ".next",
  "generated",
]);
const testPattern =
  /(?:^|\/)(?:test|tests|__tests__)(?:\/|$)|\.(?:test|spec)\.[^.]+$/;
const intentionalPrefixes = [
  // Product-approved future feature. Remove this exemption when UI routing is implemented.
  "apps/web/src/features/differentiators/",
];
const files = new Set();
const allSourceFiles = new Set();
const incoming = new Map();

async function walk(dir, collector = files) {
  if (!existsSync(dir)) return;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path, collector);
    else if (extensions.includes(extname(entry.name))) {
      const normalized = relative(process.cwd(), path).replaceAll("\\", "/");
      if (!testPattern.test(normalized)) collector.add(normalized);
    }
  }
}

for (const root of roots) await walk(root);
for (const root of ["apps", "packages"]) await walk(root, allSourceFiles);
for (const file of files) incoming.set(file, 0);

const candidatesFor = (base) => [
  base,
  ...extensions.map((ext) => `${base}${ext}`),
  ...extensions.map((ext) => join(base, `index${ext}`)),
];

function resolveImport(sourceFile, specifier) {
  let base;
  if (specifier.startsWith(".")) {
    base = resolve(dirname(sourceFile), specifier);
  } else if (specifier.startsWith("@/")) {
    const appMatch = sourceFile.match(/^(apps\/[^/]+)\/src\//);
    if (!appMatch) return null;
    base = resolve(appMatch[1], "src", specifier.slice(2));
  } else if (specifier.startsWith("@pos/ui/")) {
    base = resolve("packages/ui/src", specifier.slice("@pos/ui/".length));
  } else {
    return null;
  }

  for (const candidate of candidatesFor(base)) {
    const normalized = relative(process.cwd(), candidate).replaceAll("\\", "/");
    if (allSourceFiles.has(normalized)) return normalized;
  }
  return null;
}

const importPattern = /(?:from\s+|import\s*\(\s*)["']([^"']+)["']/g;
for (const file of allSourceFiles) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(importPattern)) {
    const target = resolveImport(file, match[1]);
    if (target && incoming.has(target))
      incoming.set(target, (incoming.get(target) ?? 0) + 1);
  }
}

function isConventionOrIntentional(file) {
  const name = basename(file);
  if (/^index\.(?:ts|tsx)$/.test(name)) return true;
  if (
    /\/(?:constants|types|schemas|query-keys|query-options)\.(?:ts|tsx)$/.test(
      file,
    )
  )
    return true;
  if (intentionalPrefixes.some((prefix) => file.startsWith(prefix)))
    return true;
  return false;
}

const findings = [...files]
  .filter((file) => (incoming.get(file) ?? 0) === 0)
  .filter((file) => !isConventionOrIntentional(file))
  .sort();

if (findings.length) {
  console.error(
    "Potential unreferenced production UI/feature source files detected:",
  );
  for (const file of findings) console.error(`- ${file}`);
  process.exit(1);
}

console.log(
  `Dead-code audit passed (${files.size} production UI/feature TS/TSX files scanned).`,
);
