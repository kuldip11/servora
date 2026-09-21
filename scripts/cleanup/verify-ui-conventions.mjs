import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const roots = ["apps", "packages"];
const sourceExtensions = new Set([".ts", ".tsx"]);
const testPattern =
  /(?:^|\/)(?:test|tests|__tests__)(?:\/|$)|\.(?:test|spec)\.[^.]+$/;
const violations = [];

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (
      ["node_modules", "dist", "coverage", ".turbo", ".next"].includes(
        entry.name,
      )
    )
      continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (sourceExtensions.has(extname(entry.name))) await inspect(path);
  }
}

async function inspect(path) {
  const normalized = path.replaceAll("\\", "/");
  if (testPattern.test(normalized)) return;
  const source = await readFile(path, "utf8");
  const file = relative(process.cwd(), path);

  if (/\bSelectMenu\b/.test(source)) {
    violations.push(`${file}: legacy SelectMenu reference`);
  }
  if (/<select(?:\s|>)/.test(source)) {
    violations.push(
      `${file}: native <select> is forbidden; use @pos/ui Select`,
    );
  }
}

for (const root of roots) await walk(root);

if (violations.length) {
  console.error(
    "UI cleanup convention violations:\n" +
      violations.map((item) => `- ${item}`).join("\n"),
  );
  process.exit(1);
}

console.log("UI cleanup conventions verified.");
