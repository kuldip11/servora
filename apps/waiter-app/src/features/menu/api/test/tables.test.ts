import { describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared/lib/api-client";
import { fetchTables } from "@/features/menu/api/tables";

vi.mock("../../../../shared/lib/api-client", () => ({
  apiClient: { get: vi.fn() },
}));

describe("fetchTables", () => {
  it("returns table data", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: [{ id: "t1" }] },
    } as any);
    await expect(fetchTables()).resolves.toEqual([{ id: "t1" }]);
    expect(apiClient.get).toHaveBeenCalledWith("/tables");
  });

  it("forwards the query cancellation signal to the HTTP request", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: [{ id: "t1" }] },
    } as any);
    const signal = new AbortController().signal;
    await expect(fetchTables(signal)).resolves.toEqual([{ id: "t1" }]);
    expect(apiClient.get).toHaveBeenCalledWith("/tables", { signal });
  });
});
