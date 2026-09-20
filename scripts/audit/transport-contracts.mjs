import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

const root = resolve(process.cwd());
const scanRoots = [
  resolve(root, "apps/api/src"),
  resolve(root, "packages/realtime/src"),
  resolve(root, "packages/api-client/src"),
];
const extensions = new Set([".ts", ".tsx"]);
const ignoredSegments = ["/test/", "/tests/", "/generated/"];

const collect = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return collect(full);
      return extensions.has(extname(entry.name)) ? [full] : [];
    }),
  );
  return nested.flat();
};

const files = (await Promise.all(scanRoots.map(collect))).flat();
const violations = [];

for (const file of files) {
  const display = `/${relative(root, file).replaceAll("\\\\", "/")}`;
  if (ignoredSegments.some((segment) => display.includes(segment))) continue;
  const source = await readFile(file, "utf8");

  const checks = [
    {
      name: "concrete JSON.parse cast",
      regex: /JSON\.parse\([^\n;]*\)\s+as\s+(?!unknown\b)[A-Za-z_$<{[]/g,
      reason: "Parse into unknown and runtime-validate before narrowing.",
    },
    {
      name: "raw Axios error payload parsing",
      regex: /response\??\.data\??\.(?:message|error)/g,
      reason:
        "Use the shared ApiClientError normalizer instead of parsing backend internals.",
    },
    {
      name: "raw stack serialization",
      regex: /(?:return|body|json)\b[^\n]*(?:error\.)?stack/g,
      reason: "Stack traces must remain server-side.",
    },
  ];

  for (const check of checks) {
    for (const match of source.matchAll(check.regex)) {
      const line = source.slice(0, match.index).split("\n").length;
      violations.push(
        `${relative(root, file)}:${line} ${check.name} — ${check.reason}`,
      );
    }
  }
}

if (violations.length) {
  console.error(
    "Transport-boundary audit failed:\n" +
      violations.map((value) => `- ${value}`).join("\n"),
  );
  process.exit(1);
}

console.log(
  `Transport-boundary audit passed (${files.length} source files scanned).`,
);
