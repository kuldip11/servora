// @vitest-environment jsdom
import React from "react";
import { describe, expect, it } from "vitest";
import { WebDemo } from "./WebDemo";
import {
  findButton,
  findByText,
  findOption,
  findSelectByLabel,
  renderDemo,
} from "./testUtils";

describe("WebDemo", () => {
  it("switches management sections and branch context", async () => {
    const demo = await renderDemo(<WebDemo />);

    expect(findByText(demo.container, "Today at a glance")).toBeTruthy();
    await demo.click(findButton(demo.container, "Business"));
    expect(findByText(demo.container, "Business structure")).toBeTruthy();

    const branch = findSelectByLabel(demo.container, "Branch");
    await demo.click(branch);
    await demo.click(findOption("Connaught Place"));
    expect(branch.textContent).toContain("Connaught Place");

    await demo.unmount();
  });
});
