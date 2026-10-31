import { expect, test } from "@playwright/test";
const routes = [
  "/",
  "/product",
  "/apps",
  "/pricing",
  "/contact",
  "/book-a-demo",
  "/product/qr-ordering",
  "/product/kitchen-display",
  "/product/billing-and-payments",
  "/product/inventory",
];
for (const width of [1920, 1440, 768, 390, 320]) {
  test(`major routes fit a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        route,
      ).toBe(true);
      await expect(page.locator("main")).toHaveCount(1);
      await expect(page.locator("main h1")).toHaveCount(1);
    }
  });
}
test("mobile navigation opens, follows links and returns focus on Escape", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  await menu.click();
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await menu.click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Pricing", exact: true })
    .click();
  await expect(page).toHaveURL(/\/pricing$/);
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).toHaveCount(0);
});
