import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const commonBrandAssets = ["favicon.svg", "favicon.ico", "apple-touch-icon.png"];
const websiteOnlyBrandAssets = ["icon-192.png", "icon-512.png", "maskable-icon-512.png"];

const appOg = {
  website: "website",
  web: "business",
  "waiter-app": "waiter",
  "kitchen-display": "kitchen",
  "customer-app": "customer",
};

const sourceOgName = {
  website: "website",
  web: "web",
  "waiter-app": "waiter",
  "kitchen-display": "kitchen",
  "customer-app": "customer",
};

for (const [app, ogAlias] of Object.entries(appOg)) {
  const publicDir = resolve(`apps/${app}/public`);
  const socialDir = resolve(publicDir, "social");
  mkdirSync(publicDir, { recursive: true });
  mkdirSync(socialDir, { recursive: true });

  for (const asset of commonBrandAssets) {
    copyFileSync(resolve(`packages/seo/assets/brand/${asset}`), resolve(publicDir, asset));
  }

  if (app === "website") {
    for (const asset of websiteOnlyBrandAssets) {
      copyFileSync(resolve(`packages/seo/assets/brand/${asset}`), resolve(publicDir, asset));
    }
  } else {
    for (const asset of websiteOnlyBrandAssets) {
      rmSync(resolve(publicDir, asset), { force: true });
    }
  }

  rmSync(resolve(socialDir, "og-default.png"), { force: true });
  const source = resolve(`packages/seo/assets/og/${sourceOgName[app]}.png`);
  copyFileSync(source, resolve(socialDir, `og-${ogAlias}.png`));
}

console.log("Servora SEO runtime assets synchronized with minimal per-app output.");
