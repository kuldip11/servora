import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock("../../../../shared/lib/api-client", () => ({ apiClient: api }));

import { menuBranchOverridesService } from "@/features/menu/services/menu-branch-overrides.service";

describe("menuBranchOverridesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.put.mockResolvedValue({ data: { data: {} } });
  });

  it("lists overrides for an item", async () => {
    const overrides = [{ branchId: "br-1" }];
    api.get.mockResolvedValue({ data: { data: overrides } });
    await expect(menuBranchOverridesService.list("item-1")).resolves.toEqual(
      overrides,
    );
    expect(api.get).toHaveBeenCalledWith("/menu/items/item-1/branches");
  });

  it("normalizes blank numeric and status values to null when saving", async () => {
    await menuBranchOverridesService.save("item-1", "br-1", {
      price: "  ",
      taxRate: "5.5",
      prepTimeMinutes: "10",
      status: "",
      isHidden: true,
      availabilityReason: "  ",
    });
    expect(api.put).toHaveBeenCalledWith("/menu/items/item-1/branch/br-1", {
      price: null,
      taxRate: 5.5,
      prepTimeMinutes: 10,
      status: null,
      isHidden: true,
      availabilityReason: null,
    });
  });

  it("resets a branch override", async () => {
    await menuBranchOverridesService.reset("item-1", "br-1");
    expect(api.delete).toHaveBeenCalledWith("/menu/items/item-1/branch/br-1");
  });
});
