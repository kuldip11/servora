import { expect, test } from "@playwright/test";

test("contact form keeps entries through a failure and clears after success", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("servora_cookie_consent", "essential"),
  );
  let attempts = 0;
  await page.route("**/api/lead", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.source).toBe("contact");
    expect(body.email).toBe("review@example.com");
    attempts += 1;
    await route.fulfill({
      status: attempts === 1 ? 503 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        attempts === 1 ? { error: "Please try again shortly." } : { ok: true },
      ),
    });
  });
  await page.goto("/contact");
  const form = page.locator("form");
  await expect(form.getByRole("alert")).toHaveCount(0);
  const submit = page.getByRole("button", { name: "Send message" });
  await expect(submit).toBeDisabled();
  await page
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Review visitor");
  await page
    .getByRole("textbox", { name: "Work email" })
    .fill("review@example.com");
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("Can we discuss a two-branch restaurant setup?");
  await submit.click();
  await expect(form.getByRole("alert")).toHaveText("Please try again shortly.");
  await expect(
    page.getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveValue("Review visitor");
  await submit.click();
  await expect(form.getByRole("status")).toContainText(
    "Your message has been sent",
  );
  await expect(
    page.getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveValue("");
  await expect(form.getByRole("alert")).toHaveCount(0);
  expect(attempts).toBe(2);
});
