import { readdir, stat } from "node:fs/promises";
import { resolve, relative } from "node:path";

const KB = 1024;
const budgets = [
  {
    app: "web",
    directory: "apps/web/dist/assets",
    maxChunkKb: 650,
    maxTotalJsKb: 1800,
  },
  {
    app: "waiter",
    directory: "apps/waiter-app/dist/assets",
    maxChunkKb: 650,
    maxTotalJsKb: 1800,
  },
  {
    app: "kitchen",
    directory: "apps/kitchen-display/dist/assets",
    maxChunkKb: 650,
    maxTotalJsKb: 1800,
  },
  {
    app: "customer",
    directory: "apps/customer-app/dist/assets",
    maxChunkKb: 650,
    maxTotalJsKb: 1800,
  },
];

const exists = async (path) => {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
};

let failed = false;
for (const budget of budgets) {
  const directory = resolve(budget.directory);
  if (!(await exists(directory))) {
    console.warn(
      `[performance] ${budget.app}: skipped; ${budget.directory} does not exist`,
    );
    continue;
  }

  const files = (await readdir(directory)).filter((file) =>
    file.endsWith(".js"),
  );
  const sizes = await Promise.all(
    files.map(async (file) => ({
      file,
      bytes: (await stat(resolve(directory, file))).size,
    })),
  );
  const totalBytes = sizes.reduce((sum, item) => sum + item.bytes, 0);
  const largest = sizes.sort((a, b) => b.bytes - a.bytes)[0];
  const totalKb = totalBytes / KB;
  const largestKb = (largest?.bytes ?? 0) / KB;

  console.log(
    `[performance] ${budget.app}: ${totalKb.toFixed(1)} KB JS total; largest chunk ${largestKb.toFixed(1)} KB${largest ? ` (${relative(process.cwd(), resolve(directory, largest.file))})` : ""}`,
  );

  if (largestKb > budget.maxChunkKb) {
    failed = true;
    console.error(
      `[performance] ${budget.app}: largest JS chunk exceeds ${budget.maxChunkKb} KB budget`,
    );
  }
  if (totalKb > budget.maxTotalJsKb) {
    failed = true;
    console.error(
      `[performance] ${budget.app}: total JS exceeds ${budget.maxTotalJsKb} KB budget`,
    );
  }
}

if (failed) process.exit(1);
console.log("[performance] Frontend bundle budgets passed.");
