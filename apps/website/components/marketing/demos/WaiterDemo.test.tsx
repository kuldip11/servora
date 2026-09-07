// @vitest-environment jsdom
import React from "react";
import { describe, expect, it } from "vitest";
import { WaiterDemo } from "./WaiterDemo";
import { findTab, renderDemo } from "./testUtils";

describe("WaiterDemo", () => {
  it("switches between waiter workflow screens", async () => {
    const demo = await renderDemo(<WaiterDemo />);

    expect(findTab(demo.container, "Home").getAttribute("aria-selected")).toBe(
      "true",
    );
    await demo.click(findTab(demo.container, "Orders"));
    expect(
      findTab(demo.container, "Orders").getAttribute("aria-selected"),
    ).toBe("true");
    await demo.click(findTab(demo.container, "New order"));
    expect(
      findTab(demo.container, "New order").getAttribute("aria-selected"),
    ).toBe("true");

    await demo.unmount();
  });
});
