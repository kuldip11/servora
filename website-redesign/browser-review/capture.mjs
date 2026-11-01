import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
const require = createRequire(
  new URL("../../apps/website/package.json", import.meta.url),
);
const { chromium } = require("@playwright/test");
const routes = [
  "/",
  "/product",
  "/apps",
  "/pricing",
  "/book-a-demo",
  "/contact",
  "/demo",
  "/legal/privacy",
  "/legal/terms",
  "/legal/cookies",
  ...[
    "pos-and-orders",
    "kitchen-display",
    "waiter-app",
    "qr-ordering",
    "menu-management",
    "billing-and-payments",
    "inventory",
    "analytics",
    "multi-branch",
    "staff-and-roles",
    "security",
  ].map((s) => "/product/" + s),
];
const out = new URL("./output/", import.meta.url);
await mkdir(out, { recursive: true });
const server = spawn(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "start", "--port", "3001"],
  { cwd: new URL("../../apps/website/", import.meta.url), stdio: "inherit" },
);
let browser;
try {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch("http://127.0.0.1:3001")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  browser = await chromium.launch();
  const results = [];
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({
      viewport: { width, height: 1000 },
      reducedMotion: "reduce",
    });
    await page.addInitScript(() =>
      localStorage.setItem("servora_cookie_consent", "essential"),
    );
    for (const route of routes) {
      const response = await page.goto("http://127.0.0.1:3001" + route, {
        waitUntil: "networkidle",
      });
      await page.evaluate(() => document.fonts.ready);
      await page
        .locator("img")
        .evaluateAll((imgs) =>
          Promise.all(imgs.map((img) => img.decode().catch(() => {}))),
        );
      const key = route === "/" ? "home" : route.slice(1).replaceAll("/", "-");
      await page.screenshot({
        path: new URL(`${key}-${width}.png`, out).pathname,
        fullPage: true,
      });
      results.push({
        route,
        width,
        status: response.status(),
        ...(await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth,
          h1: document.querySelectorAll("h1").length,
          main: document.querySelectorAll("main").length,
          images: [...document.images]
            .filter((i) => !i.complete || i.naturalWidth === 0)
            .map((i) => i.src),
        }))),
      });
    }
    await page.close();
  }
  await writeFile(
    new URL("results.json", out),
    JSON.stringify(results, null, 2),
  );
  const failures = results.filter(
    (r) =>
      r.status !== 200 ||
      r.overflow ||
      r.h1 !== 1 ||
      r.main !== 1 ||
      r.images.length,
  );
  console.log(JSON.stringify({ pages: results.length, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  await browser?.close();
  server.kill();
}
