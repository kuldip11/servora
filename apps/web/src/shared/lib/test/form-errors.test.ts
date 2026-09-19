import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyApiFieldErrors } from "../form-errors";

const mocks = vi.hoisted(() => ({
  extractApiFieldErrors: vi.fn(),
}));

vi.mock("@pos/api-client", () => ({
  extractApiFieldErrors: mocks.extractApiFieldErrors,
}));

type Values = {
  name: string;
  price: string;
};

describe("applyApiFieldErrors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps known backend fields and focuses only the first error", () => {
    mocks.extractApiFieldErrors.mockReturnValue({
      name: ["Name already exists"],
      price: ["Price must be positive"],
    });
    const setError = vi.fn();

    const applied = applyApiFieldErrors<Values>(new Error("bad"), setError, {
      knownFields: ["name", "price"],
    });

    expect(applied).toBe(true);
    expect(setError).toHaveBeenNthCalledWith(
      1,
      "name",
      { type: "server", message: "Name already exists" },
      { shouldFocus: true },
    );
    expect(setError).toHaveBeenNthCalledWith(
      2,
      "price",
      { type: "server", message: "Price must be positive" },
      { shouldFocus: false },
    );
  });

  it("routes unknown backend fields to a form-level fallback", () => {
    mocks.extractApiFieldErrors.mockReturnValue({
      unknownServerField: ["This configuration is no longer valid"],
    });
    const setError = vi.fn();
    const onUnknownFieldErrors = vi.fn();

    const applied = applyApiFieldErrors<Values>(new Error("bad"), setError, {
      knownFields: ["name", "price"],
      onUnknownFieldErrors,
    });

    expect(applied).toBe(false);
    expect(setError).not.toHaveBeenCalled();
    expect(onUnknownFieldErrors).toHaveBeenCalledWith([
      "This configuration is no longer valid",
    ]);
  });

  it("preserves the legacy mapping behavior when known fields are omitted", () => {
    mocks.extractApiFieldErrors.mockReturnValue({ name: ["Required"] });
    const setError = vi.fn();

    expect(applyApiFieldErrors<Values>(new Error("bad"), setError)).toBe(true);
    expect(setError).toHaveBeenCalledWith(
      "name",
      { type: "server", message: "Required" },
      { shouldFocus: true },
    );
  });
});
