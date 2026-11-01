import { test, expect } from "@playwright/test";
import { modules } from "@/content/modules";

const routes = [
  "/",
  "/product",
  "/apps",
  "/demo",
  "/pricing",
  "/book-a-demo",
  "/contact",
  "/legal/privacy",
  "/legal/terms",
  "/legal/cookies",
  ...modules.map((module) => `/product/${module.slug}`),
];

test("published marketing routes resolve", async ({ page }) => {
  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await expect(page.locator("main")).toBeVisible();
  }
});

test("robots and sitemap are available", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("/sitemap.xml");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const body = await sitemap.text();
  expect(body).toContain("/product/qr-ordering");
  expect(body).not.toContain("/resources");
});

test("application ecosystem navigation exposes all configured apps", async ({
  page,
}) => {
  await page.goto("/apps");
  const destinations = [
    process.env.NEXT_PUBLIC_WEB_APP_URL ?? "/app",
    process.env.NEXT_PUBLIC_KITCHEN_APP_URL ?? "/kitchen",
    process.env.NEXT_PUBLIC_WAITER_APP_URL ?? "/waiter",
    process.env.NEXT_PUBLIC_CUSTOMER_APP_URL ?? "/order",
  ];
  for (const href of destinations) {
    await expect(page.locator(`main a[href="${href}"]`)).toHaveCount(1);
  }
});
