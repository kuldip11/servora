import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("servora_cookie_consent", "essential"),
  );
});

test("a guest order progresses through the kitchen and floor", async ({
  page,
}) => {
  await page.goto("/demo");
  await page.getByRole("button", { name: "View order · 2 items" }).click();
  await expect(page.getByTestId("demo-total")).toHaveText("₹903.00");
  await page.getByRole("button", { name: "Place sample order" }).click();
  await page.getByRole("button", { name: "Request water" }).click();
  await page
    .getByRole("button", { name: "Kitchen display", exact: true })
    .click();
  await page.getByRole("button", { name: "Start cooking" }).click();
  await page.getByRole("button", { name: "Mark ready" }).click();
  await page.getByRole("button", { name: "Waiter app", exact: true }).click();
  await expect(page.getByText("Ready to serve", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Water requested", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Resolve request" }).click();
  await expect(page.getByText("Water requested", { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Reset sample" }).click();
  await expect(
    page.getByText("No active sample order. Start in guest ordering."),
  ).toBeVisible();
});

test("product tour supports keyboard selection and full-size views", async ({
  page,
}) => {
  await page.goto("/");
  const tabs = page.getByRole("tab");
  await tabs.first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  const panel = page.getByRole("tabpanel");
  await panel.getByRole("button", { name: /Enlarge/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("narrow navigation exposes conversion and product links", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page
    .getByRole("link", { name: "Pricing", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/pricing$/);
});
