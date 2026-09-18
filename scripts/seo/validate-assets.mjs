import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const privateApps = {
  web: "business",
  "waiter-app": "waiter",
  "kitchen-display": "kitchen",
  "customer-app": "customer",
};
const commonRequired = ["favicon.svg", "favicon.ico", "apple-touch-icon.png"];
const websiteOnly = ["icon-192.png", "icon-512.png", "maskable-icon-512.png"];
const failures = [];

const assertPngSize = (path, width, height, label) => {
  if (!existsSync(path)) return;
  const data = readFileSync(path);
  if (data.readUInt32BE(16) !== width || data.readUInt32BE(20) !== height) {
    failures.push(`${label}: expected ${width}x${height}`);
  }
};

for (const app of ["website", ...Object.keys(privateApps)]) {
  for (const asset of commonRequired) {
    if (!existsSync(resolve(`apps/${app}/public/${asset}`)))
      failures.push(`${app}: missing ${asset}`);
  }
  assertPngSize(
    resolve(`apps/${app}/public/apple-touch-icon.png`),
    180,
    180,
    `${app}: Apple touch icon`,
  );
}

// Website uses official Next.js metadata files, not a duplicate public OG file.
for (const file of ["opengraph-image.png", "twitter-image.png"]) {
  const path = resolve(`apps/website/app/${file}`);
  if (!existsSync(path)) failures.push(`website: missing app/${file}`);
  assertPngSize(path, 1200, 630, `website: ${file}`);
}
for (const file of ["opengraph-image.alt.txt", "twitter-image.alt.txt"]) {
  if (!existsSync(resolve(`apps/website/app/${file}`)))
    failures.push(`website: missing app/${file}`);
}
for (const redundant of [
  "apps/website/public/social/og-website.png",
  "apps/website/public/social/og-default.png",
]) {
  if (existsSync(resolve(redundant)))
    failures.push(`website: redundant ${redundant} should not exist`);
}
for (const asset of websiteOnly) {
  if (!existsSync(resolve(`apps/website/public/${asset}`)))
    failures.push(`website: missing ${asset}`);
}
assertPngSize(
  resolve("apps/website/public/icon-192.png"),
  192,
  192,
  "website: 192 icon",
);
assertPngSize(
  resolve("apps/website/public/icon-512.png"),
  512,
  512,
  "website: 512 icon",
);
assertPngSize(
  resolve("apps/website/public/maskable-icon-512.png"),
  512,
  512,
  "website: maskable icon",
);

for (const [app, ogAlias] of Object.entries(privateApps)) {
  const namedOg = resolve(`apps/${app}/public/social/og-${ogAlias}.png`);
  if (!existsSync(namedOg))
    failures.push(`${app}: missing app-specific OG image og-${ogAlias}.png`);
  assertPngSize(namedOg, 1200, 630, `${app}: OG image`);
  if (existsSync(resolve(`apps/${app}/public/social/og-default.png`))) {
    failures.push(`${app}: redundant social/og-default.png should not exist`);
  }
  for (const asset of websiteOnly) {
    if (existsSync(resolve(`apps/${app}/public/${asset}`)))
      failures.push(`${app}: redundant ${asset} should not exist`);
  }
}

for (const asset of [
  "servora-mark.svg",
  "logo-horizontal.svg",
  "logo-square.svg",
  "favicon.svg",
  "favicon.ico",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
  "maskable-icon-512.png",
]) {
  if (!existsSync(resolve(`packages/seo/assets/brand/${asset}`))) {
    failures.push(`canonical brand assets: missing ${asset}`);
  }
}

for (const source of ["website", "web", "waiter", "kitchen", "customer"]) {
  const png = resolve(`packages/seo/assets/og/${source}.png`);
  const svg = resolve(`packages/seo/assets/og/${source}.svg`);
  if (!existsSync(png))
    failures.push(`canonical OG assets: missing ${source}.png export`);
  if (!existsSync(svg))
    failures.push(`canonical OG assets: missing ${source}.svg source`);
  assertPngSize(png, 1200, 630, `canonical ${source} OG export`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(
  "SEO assets validated, including Next.js file-based website OG/Twitter images.",
);
