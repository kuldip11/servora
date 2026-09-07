// @vitest-environment jsdom
import React from "react";
import { describe, expect, it } from "vitest";
import { CustomerDemo } from "./CustomerDemo";
import { findTab, renderDemo } from "./testUtils";

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
