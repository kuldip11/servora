import { expect, test } from "@playwright/test";

for (const width of [1440, 768, 390]) {
  test(`all demonstration workspaces operate at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(() =>
      localStorage.setItem("servora_cookie_consent", "essential"),
    );
    await page.goto("/#interactive-demos");
    const demo = page.locator("#interactive-demos");
    const selector = demo.getByRole("group", {
      name: "Choose an application demonstration",
    });
    for (const [label, key] of [
      ["Guest ordering", "customer"],
      ["Waiter app", "waiter"],
      ["Kitchen display", "kitchen"],
      ["Management & POS", "management"],
    ]) {
      await selector.getByRole("button", { name: label, exact: true }).click();
      if (key === "customer") {
        await demo
          .getByRole("textbox", { name: "Search demo menu" })
          .fill("unlisted dish");
        await expect(demo.getByText("No dishes match. Try another search or category.")).toBeVisible();
      } else if (key === "waiter") {
        await demo.getByRole("tab", { name: "Orders", exact: true }).click();
        await expect(
          demo.getByRole("tab", { name: "Orders", exact: true }),
        ).toHaveAttribute("aria-selected", "true");
      } else if (key === "kitchen") {
        await demo
          .getByRole("button", { name: "Start preparing", exact: true })
          .first()
          .click();
        await expect(
          demo.getByRole("button", { name: "Mark ready", exact: true }).first(),
        ).toBeVisible();
      } else {
        await demo
          .getByRole("button", { name: "Business", exact: true })
          .click();
        await expect(
          demo.getByText("Business structure", { exact: true }),
        ).toBeVisible();
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await testInfo.attach(`demo-${key}-${width}`, {
        body: await demo.screenshot({ type: "jpeg", quality: 80 }),
        contentType: "image/jpeg",
      });
    }
  });
}
