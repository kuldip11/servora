import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const indexHtml = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

describe("initial HTML bootstrap", () => {
  it("renders a non-empty zero-JavaScript loader before React mounts", () => {
    expect(indexHtml).toContain("data-servora-initial-loader");
    expect(indexHtml).toContain("Preparing your workspace…");
    expect(indexHtml).toContain('aria-busy="true"');
    expect(indexHtml).not.toContain('<div id="root"></div>');
  });
});
