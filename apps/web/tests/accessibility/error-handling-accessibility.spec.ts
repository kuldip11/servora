import { expect, test } from "@playwright/test";

test.describe("UI error handling accessibility", () => {
  test("associates client validation errors and focuses the first invalid field", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: "Sign in" }).click();

    const email = page.getByLabel("Email address");
    const password = page.getByLabel("Password", { exact: true });

    await expect(email).toBeFocused();
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(password).toHaveAttribute("aria-invalid", "true");

    const emailDescribedBy = await email.getAttribute("aria-describedby");
    const passwordDescribedBy = await password.getAttribute("aria-describedby");

    expect(emailDescribedBy).toBeTruthy();
    expect(passwordDescribedBy).toBeTruthy();

    await expect(page.locator(`#${emailDescribedBy}`)).toBeVisible();
    await expect(page.locator(`#${passwordDescribedBy}`)).toBeVisible();
  });

  test("keeps password visibility control keyboard accessible", async ({
    page,
  }) => {
    await page.goto("/login");

    const password = page.getByLabel("Password", { exact: true });
    const toggle = page.getByRole("button", { name: "Show password" });

    await toggle.focus();
    await expect(toggle).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(password).toHaveAttribute("type", "text");
    await expect(
      page.getByRole("button", { name: "Hide password" }),
    ).toBeVisible();
  });
});
