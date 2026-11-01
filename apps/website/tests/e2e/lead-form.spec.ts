import { test, expect } from "@playwright/test";

test("demo enquiry keeps input after delivery failure and reports successful retry", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("servora_cookie_consent", "essential"),
  );
  let attempts = 0;
  await page.route("**/api/lead", (route) => {
    attempts++;
    return route.fulfill({
      status: attempts === 1 ? 503 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        attempts === 1
          ? { error: "Delivery unavailable. Please retry." }
          : { ok: true },
      ),
    });
  });
  await page.goto("/book-a-demo");
  await page
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Restaurant operator");
  await page
    .getByRole("textbox", { name: "Work email", exact: true })
    .fill("operator@example.test");
  await page
    .getByRole("textbox", { name: "Restaurant / business", exact: true })
    .fill("Table Twelve");
  await page
    .getByRole("textbox", { name: "What would you like to see?", exact: true })
    .fill("We would like to explore the kitchen and floor handoff.");
  const submit = page.getByRole("button", {
    name: "Request a Demo",
    exact: true,
  });
  await submit.click();
  await expect(page.getByRole("alert")).toHaveText(
    "Delivery unavailable. Please retry.",
  );
  await expect(
    page.getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveValue("Restaurant operator");
  await submit.click();
  await expect(page.getByRole("status")).toContainText(
    "Your request has been sent",
  );
  await expect(
    page.getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveValue("");
  expect(attempts).toBe(2);
});
