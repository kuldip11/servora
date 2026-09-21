import { describe, expect, it, vi } from "vitest";
const extract = vi.hoisted(() => vi.fn());
vi.mock("@pos/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@pos/api-client")>()),
  extractApiError: extract,
}));
import { getErrorMessage } from "@/shared/lib/errors";
describe("getErrorMessage", () => {
  it("returns extracted API messages", () => {
    extract.mockReturnValue("Invalid order");
    expect(getErrorMessage(new Error("x"))).toBe("Invalid order");
  });
  it("uses fallback for generic or empty messages", () => {
    extract.mockReturnValue("Request failed");
    expect(getErrorMessage({}, "Unable to load")).toBe("Unable to load");
    extract.mockReturnValue("");
    expect(getErrorMessage({}, "Fallback")).toBe("Fallback");
  });
});
