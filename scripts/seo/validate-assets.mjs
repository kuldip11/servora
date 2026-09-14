import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const apps = {
  website: "website",
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

for (const [app, ogAlias] of Object.entries(apps)) {
  for (const asset of commonRequired) {
    if (!existsSync(resolve(`apps/${app}/public/${asset}`))) failures.push(`${app}: missing ${asset}`);
  }

  const namedOg = resolve(`apps/${app}/public/social/og-${ogAlias}.png`);
  if (!existsSync(namedOg)) failures.push(`${app}: missing app-specific OG image og-${ogAlias}.png`);
  assertPngSize(namedOg, 1200, 630, `${app}: OG image`);
  assertPngSize(resolve(`apps/${app}/public/apple-touch-icon.png`), 180, 180, `${app}: Apple touch icon`);

  const legacyDefault = resolve(`apps/${app}/public/social/og-default.png`);
  if (existsSync(legacyDefault)) failures.push(`${app}: redundant social/og-default.png should not exist`);

  if (app === "website") {
    for (const asset of websiteOnly) {
      if (!existsSync(resolve(`apps/${app}/public/${asset}`))) failures.push(`${app}: missing ${asset}`);
    }
    assertPngSize(resolve(`apps/${app}/public/icon-192.png`), 192, 192, `${app}: 192 icon`);
    assertPngSize(resolve(`apps/${app}/public/icon-512.png`), 512, 512, `${app}: 512 icon`);
    assertPngSize(resolve(`apps/${app}/public/maskable-icon-512.png`), 512, 512, `${app}: maskable icon`);
  } else {
    for (const asset of websiteOnly) {
      if (existsSync(resolve(`apps/${app}/public/${asset}`))) failures.push(`${app}: redundant ${asset} should not exist`);
    }
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
  if (!existsSync(png)) failures.push(`canonical OG assets: missing ${source}.png export`);
  if (!existsSync(svg)) failures.push(`canonical OG assets: missing ${source}.svg source`);
  assertPngSize(png, 1200, 630, `canonical ${source} OG export`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("SEO assets validated with minimal runtime duplication across all five Servora apps.");
