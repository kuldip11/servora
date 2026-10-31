import { expect, test } from "@playwright/test";
import { modules } from "@/content/modules";
const routes = [
  "/",
  "/product",
  "/apps",
  "/pricing",
  "/contact",
  "/book-a-demo",
  ...modules.map((module) => `/product/${module.slug}`),
  "/legal/privacy",
  "/legal/terms",
  "/legal/cookies",
];
for (const width of [1440, 768, 390]) {
  test(`visual review at ${width}px`, async ({ page }, testInfo) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(() =>
      localStorage.setItem("servora_cookie_consent", "essential"),
    );
    for (const route of routes) {
      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response?.status(), route).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        route,
      ).toBe(true);
      const name = `${route === "/" ? "home" : route.slice(1).replaceAll("/", "-")}-${width}`;
      await testInfo.attach(name, {
        body: await page.screenshot({
          fullPage: true,
          type: "jpeg",
          quality: 75,
        }),
        contentType: "image/jpeg",
      });
    }
  });
}
