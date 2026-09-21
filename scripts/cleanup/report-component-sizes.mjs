import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const roots = ["apps", "packages"];
const rows = [];
const ignoredSegments = ["/test/", "/tests/", "/__tests__/", "/stories/"];

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
    else if (extname(entry.name) === ".tsx") await inspect(path);
  }
}

async function inspect(path) {
  const normalized = `/${path.replaceAll("\\", "/")}`;
  if (ignoredSegments.some((segment) => normalized.includes(segment))) return;
  if (/\.(?:test|spec)\.tsx$/.test(path)) return;
  const lines = (await readFile(path, "utf8")).split("\n").length;
  if (lines >= 300) rows.push({ file: relative(process.cwd(), path), lines });
}

for (const root of roots) await walk(root);
rows.sort((a, b) => b.lines - a.lines);

if (!rows.length) {
  console.log("No production TSX files are 300+ lines.");
} else {
  console.log("Production TSX files at 300+ lines (informational):");
  for (const row of rows)
    console.log(`${String(row.lines).padStart(4)}  ${row.file}`);
}
