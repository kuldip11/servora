// @vitest-environment jsdom
import React from "react";
import { describe, expect, it } from "vitest";
import { KitchenDemo } from "./KitchenDemo";
import { findButton, findByText, renderDemo } from "./testUtils";

describe("KitchenDemo", () => {
  it("advances and resets kitchen tickets", async () => {
    const demo = await renderDemo(<KitchenDemo />);

    expect(findByText(demo.container, "2 active")).toBeTruthy();
    await demo.click(findButton(demo.container, "Start preparing"));
    expect(
      Array.from(demo.container.querySelectorAll("button")).filter(
        (button) => button.textContent?.trim() === "Mark ready",
      ).length,
    ).toBeGreaterThan(0);
    await demo.click(findButton(demo.container, "Reset demo"));
    expect(findByText(demo.container, "2 active")).toBeTruthy();

    await demo.unmount();
  });
});
