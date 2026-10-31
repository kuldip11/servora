import { describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared/lib/api-client";
import { fetchCategories } from "@/features/menu/api/menu";

vi.mock("../../../../shared/lib/api-client", () => ({
  apiClient: { get: vi.fn() },
}));

describe("fetchCategories", () => {
  it("returns menu category data", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: [{ id: "c1" }] },
    } as any);
    await expect(fetchCategories()).resolves.toEqual([{ id: "c1" }]);
    expect(apiClient.get).toHaveBeenCalledWith("/menu/categories");
  });

  it("forwards a cancellation signal", async () => {
    const signal = new AbortController().signal;
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: [] } } as any);
    await fetchCategories(signal);
    expect(apiClient.get).toHaveBeenCalledWith("/menu/categories", { signal });
  });
});
