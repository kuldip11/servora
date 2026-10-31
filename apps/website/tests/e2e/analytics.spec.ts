import { test, expect, type Page } from "@playwright/test";

const pageViews = (page: Page) =>
  page.evaluate(() => {
    const layer =
      (window as Window & { dataLayer?: ArrayLike<unknown>[] }).dataLayer ?? [];
    return layer
      .map((entry) => Array.from(entry))
      .filter((entry) => entry[0] === "event" && entry[1] === "page_view")
      .map((entry) => entry[2] as { page_path: string; page_location: string });
  });

test("production analytics records one view per navigation after consent", async ({
  page,
}) => {
  test.skip(
    !process.env.NEXT_PUBLIC_GA_ID,
    "Requires an explicit test measurement ID in the build",
  );
  await page.route("https://www.googletagmanager.com/**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "/* offline tag fixture */",
    }),
  );
  await page.route(/https:\/\/[^/]*google-analytics\.com\//, (route) =>
    route.abort(),
  );
  await page.addInitScript(() =>
    localStorage.setItem("servora_cookie_consent", "accepted"),
  );
  await page.goto("/");
  await expect.poll(() => pageViews(page)).toHaveLength(1);
  await page
    .getByRole("link", { name: "Pricing", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/pricing$/);
  await expect.poll(() => pageViews(page)).toHaveLength(2);
  const views = await pageViews(page);
  expect(views.map((view) => view.page_path)).toEqual(["/", "/pricing"]);
  expect(views.every((view) => !view.page_location.includes("?"))).toBe(true);
  await page.evaluate(() => {
    localStorage.setItem("servora_cookie_consent", "essential");
    window.dispatchEvent(new Event("servora:consent-changed"));
  });
  await expect
    .poll(() =>
      page.evaluate(
        (id) =>
          (window as unknown as Record<string, unknown>)[`ga-disable-${id}`],
        process.env.NEXT_PUBLIC_GA_ID,
      ),
    )
    .toBe(true);
  await page
    .getByRole("link", { name: "Product", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/product$/);
  expect(await pageViews(page)).toHaveLength(2);
});
