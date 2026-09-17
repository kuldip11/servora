import { existsSync, readFileSync } from "node:fs";

const failures = [];
const privateApps = ["web", "waiter-app", "kitchen-display", "customer-app"];
for (const app of privateApps) {
  const built = `apps/${app}/dist/index.html`;
  if (!existsSync(built)) continue;
  const html = readFileSync(built, "utf8");
  if (!html.includes("noindex,nofollow,noarchive,nosnippet"))
    failures.push(`${app}: built HTML lost noindex policy`);
  if (!html.includes("summary_large_image"))
    failures.push(`${app}: built HTML lost social card metadata`);
  if (html.includes("%VITE_PUBLIC_APP_URL%"))
    failures.push(`${app}: VITE_PUBLIC_APP_URL was not replaced in built HTML`);
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Built SEO audit passed for available app outputs.");
