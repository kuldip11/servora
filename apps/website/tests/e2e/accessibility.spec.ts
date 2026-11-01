import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const routes = [
  "/",
  "/product",
  "/pricing",
  "/demo",
  "/product/waiter-app",
  "/book-a-demo",
  "/contact",
  "/product/pos-and-orders",
  "/product/security",
] as const;

test.describe("accessibility smoke checks", () => {
  for (const route of routes) {
    test(`${route} has no critical or serious axe violations`, async ({
      page,
    }) => {
      await page.goto(route);
      await expect(page.locator("main#main")).toBeVisible();
      const results = await new AxeBuilder({ page }).analyze();
      const blocking = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      expect(
        blocking,
        blocking.map((v) => `${v.id}: ${v.help}`).join("\n"),
      ).toEqual([]);
    });
  }
});
