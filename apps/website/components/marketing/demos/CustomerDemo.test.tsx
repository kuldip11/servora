// @vitest-environment jsdom
import React from "react";
import { describe, expect, it } from "vitest";
import { CustomerDemo } from "./CustomerDemo";
import { findTab, findButton, renderDemo } from "./testUtils";

describe("CustomerDemo", () => {
  it("moves between menu, customization, cart and status screens", async () => {
    const demo = await renderDemo(<CustomerDemo />);

    expect(findTab(demo.container, "menu").getAttribute("aria-selected")).toBe(
      "true",
    );
    await demo.click(findTab(demo.container, "customize"));
    expect(
      findTab(demo.container, "customize").getAttribute("aria-selected"),
    ).toBe("true");
    await demo.click(findTab(demo.container, "cart"));
    expect(findTab(demo.container, "cart").getAttribute("aria-selected")).toBe(
      "true",
    );
    await demo.click(findTab(demo.container, "status"));
    expect(
      findTab(demo.container, "status").getAttribute("aria-selected"),
    ).toBe("true");

    await demo.unmount();
  });
});

it("keeps all selected extras and quantity consistent between customization and cart", async () => {
  const demo = await renderDemo(<CustomerDemo />);
  await demo.click(findTab(demo.container, "customize"));
  await demo.click(findButton(demo.container, "Chilli oil · + ₹30"));
  expect(findButton(demo.container, "Add to order · ₹820")).toBeTruthy();
  await demo.click(findButton(demo.container, "Gluten-free crust · + ₹90"));
  await demo.click(findButton(demo.container, "Increase quantity"));
  await demo.click(findButton(demo.container, "Add to order · ₹1820"));
  expect(demo.container.textContent).toContain("3 items");
  expect(demo.container.textContent).toContain("₹2310.00");
  await demo.unmount();
});

it("shows an empty menu result for a search that has no matches", async () => {
  const demo = await renderDemo(<CustomerDemo />);
  const input = demo.container.querySelector(
    'input[aria-label="Search demo menu"]',
  ) as HTMLInputElement;
  await demo.change(input, "not-a-menu-item");
  expect(demo.container.textContent).toContain("No dishes match");
  await demo.unmount();
});
