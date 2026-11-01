import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const require = createRequire(
  new URL("../../apps/website/package.json", import.meta.url),
);
const { chromium } = require("@playwright/test");
const references = [
  ["toast", "https://pos.toasttab.com/"],
  ["square", "https://squareup.com/us/en/point-of-sale/restaurants"],
  ["lightspeed", "https://www.lightspeedhq.com/pos/restaurant/"],
  ["touchbistro", "https://www.touchbistro.com/"],
  ["clover", "https://www.clover.com/pos-solutions/restaurant"],
  ["spoton", "https://www.spoton.com/"],
  ["restroworks", "https://www.restroworks.com/"],
  ["petpooja", "https://www.petpooja.com/"],
  ["gofrugal", "https://www.gofrugal.com/restaurant-pos-software.html"],
  ["urbanpiper", "https://www.urbanpiper.com/"],
];
const out = new URL("../research/screenshots/", import.meta.url);
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const [name, url] of references) {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      try {
        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        await page
          .locator("h1")
          .first()
          .waitFor({ timeout: 8000 })
          .catch(() => {});
        await page.screenshot({
          path: new URL(`${name}-${width}.jpg`, out).pathname,
          type: "jpeg",
          quality: 80,
          fullPage: false,
        });
        results.push({
          name,
          url,
          finalUrl: page.url(),
          width,
          status: response?.status(),
          title: await page.title(),
        });
      } catch (error) {
        results.push({ name, url, width, error: error.message });
      }
      await page.close();
    }
  }
} finally {
  await browser.close();
  await writeFile(
    new URL("CAPTURE-RESULTS.json", out),
    JSON.stringify(results, null, 2),
  );
}
