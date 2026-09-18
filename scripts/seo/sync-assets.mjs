import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const commonBrandAssets = ["favicon.svg", "favicon.ico", "apple-touch-icon.png"];
const websiteOnlyBrandAssets = ["icon-192.png", "icon-512.png", "maskable-icon-512.png"];

const appOg = {
  web: "business",
  "waiter-app": "waiter",
  "kitchen-display": "kitchen",
  "customer-app": "customer",
};

const sourceOgName = {
  web: "web",
  "waiter-app": "waiter",
  "kitchen-display": "kitchen",
  "customer-app": "customer",
};

// Brand assets shared by all deployments.
for (const app of ["website", ...Object.keys(appOg)]) {
  const publicDir = resolve(`apps/${app}/public`);
  mkdirSync(publicDir, { recursive: true });

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
}

// Next.js website: use the official file-based metadata convention. Next.js
// fingerprints/serves these files and emits OG/Twitter image tags itself.
const websiteOgSource = resolve("packages/seo/assets/og/website.png");
copyFileSync(websiteOgSource, resolve("apps/website/app/opengraph-image.png"));
copyFileSync(websiteOgSource, resolve("apps/website/app/twitter-image.png"));
rmSync(resolve("apps/website/public/social/og-website.png"), { force: true });
rmSync(resolve("apps/website/public/social/og-default.png"), { force: true });

// Vite private apps still need directly addressable public OG images.
for (const [app, ogAlias] of Object.entries(appOg)) {
  const socialDir = resolve(`apps/${app}/public/social`);
  mkdirSync(socialDir, { recursive: true });
  rmSync(resolve(socialDir, "og-default.png"), { force: true });
  copyFileSync(
    resolve(`packages/seo/assets/og/${sourceOgName[app]}.png`),
    resolve(socialDir, `og-${ogAlias}.png`),
  );
}

console.log("Servora SEO runtime assets synchronized using Next.js file-based social metadata for website.");
