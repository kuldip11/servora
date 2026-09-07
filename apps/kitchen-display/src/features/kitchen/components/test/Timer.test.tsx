import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Timer } from "../Timer";

describe("Timer", () => {
  it("renders urgent and non-urgent states", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    expect(
      renderToStaticMarkup(
        <Timer firedAt={new Date(now - 20 * 60_000).toISOString()} />,
      ),
    ).toContain("text-red-400");
    expect(
      renderToStaticMarkup(
        <Timer firedAt={new Date(now - 1_000).toISOString()} />,
      ),
    ).toContain("text-text-secondary");
    vi.restoreAllMocks();
  });
});
