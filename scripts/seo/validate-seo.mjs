import { readFileSync } from "node:fs";

const privateApps = {
  web: "business",
  "waiter-app": "waiter",
  "kitchen-display": "kitchen",
  "customer-app": "customer",
};
const failures = [];
for (const [app, ogAlias] of Object.entries(privateApps)) {
  const html = readFileSync(`apps/${app}/index.html`, "utf8");
  const vercel = readFileSync(`apps/${app}/vercel.json`, "utf8");
  const robots = readFileSync(`apps/${app}/public/robots.txt`, "utf8");
  if (!html.includes('name="robots" content="noindex,nofollow,noarchive,nosnippet"')) failures.push(`${app}: missing private robots meta`);
  if (!vercel.includes("X-Robots-Tag") || !vercel.includes("noindex, nofollow, noarchive, nosnippet")) failures.push(`${app}: missing complete X-Robots-Tag`);
  if (!robots.includes("Disallow: /")) failures.push(`${app}: robots.txt must disallow all routes`);
  if (!html.includes(`property="og:image" content="%VITE_PUBLIC_APP_URL%/social/og-${ogAlias}.png"`)) failures.push(`${app}: missing absolute app-specific OG image metadata`);
  if (!html.includes('name="twitter:card" content="summary_large_image"')) failures.push(`${app}: missing Twitter large card metadata`);
  const env = readFileSync(`apps/${app}/.env.example`, "utf8");
  if (!env.includes("VITE_PUBLIC_APP_URL=")) failures.push(`${app}: missing VITE_PUBLIC_APP_URL example`);
}

const sitemap = readFileSync("apps/website/app/sitemap.ts", "utf8");
for (const route of ["/login", "/legal/privacy", "/legal/terms", "/legal/cookies"]) {
  if (sitemap.includes(`\"${route}\"`)) failures.push(`website sitemap includes noindex route ${route}`);
}
const legalSeo = readFileSync("apps/website/content/seo/pages.ts", "utf8");
for (const key of ["privacy", "terms", "cookies"]) {
  const segment = legalSeo.split(`${key}: {`)[1]?.split("},")[0] ?? "";
  if (!segment.includes("index: false")) failures.push(`website: placeholder legal metadata ${key} must stay noindex`);
}
const layout = readFileSync("apps/website/app/layout.tsx", "utf8");
if (!layout.includes("BRAND_ASSETS.websiteOg")) failures.push("website: missing static fallback OG image");
const manifest = readFileSync("apps/website/app/manifest.ts", "utf8");
if (!manifest.includes("maskableIcon512")) failures.push("website: manifest missing maskable icon");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Servora SEO policy validation passed.");
