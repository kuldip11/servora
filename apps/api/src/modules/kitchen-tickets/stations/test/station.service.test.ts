import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({
  list: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  findRoutingResources: vi.fn(),
  setRoute: vi.fn(),
  removeRoute: vi.fn(),
  listRoutes: vi.fn(),
}));
vi.mock("../station.repository", () => ({ stationRepository: repository }));
import {
  stationResolver,
  stationService,
} from "@/modules/kitchen-tickets/stations/station.service";

const auth = {
  userId: "u1",
  tenantId: "t1",
  branchId: "b1",
  email: "x@y.test",
  roles: [],
  permissions: ["menu:read", "menu:update"],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("kitchen stations", () => {
  it("returns null when no station routing is configured", async () => {
    repository.listRoutes.mockResolvedValue([]);
    await expect(
      stationResolver.resolveForOrderItem("t1", "i1", ["o1"]),
    ).resolves.toBeNull();
  });

  it("prefers a selected modifier route over the item default", async () => {
    repository.listRoutes.mockResolvedValue([
      { stationId: "default", modifierOptionId: null },
      { stationId: "dessert", modifierOptionId: "o1" },
    ]);
    await expect(
      stationResolver.resolveForOrderItem("t1", "i1", []),
    ).resolves.toBe("default");
    await expect(
      stationResolver.resolveForOrderItem("t1", "i1", ["o1"]),
    ).resolves.toBe("dessert");
  });

  it("creates a station in the active tenant and branch", async () => {
    repository.create.mockResolvedValue({
      id: "s1",
      tenantId: "t1",
      branchId: "b1",
      name: "Grill",
    });
    await expect(
      stationService.create(auth, { name: "Grill" }),
    ).resolves.toMatchObject({ id: "s1" });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "t1",
        branchId: "b1",
        name: "Grill",
      }),
    );
  });

  it("rejects cross-branch item routing", async () => {
    repository.findRoutingResources.mockResolvedValue({
      item: { id: "i1", branchId: "b2" },
      station: { id: "s1", branchId: "b1" },
      modifier: null,
    });
    await expect(
      stationService.setRoute(auth, "i1", { stationId: "s1" }),
    ).rejects.toThrow("Station branch does not match");
  });
});

describe("kitchen station service edge coverage", () => {
  it("lists using explicit branch, auth branch, and no branch", async () => {
    repository.list.mockResolvedValue([]);
    await stationService.list(auth, "b2");
    await stationService.list(auth);
    await stationService.list({ ...auth, branchId: null });
    expect(repository.list).toHaveBeenNthCalledWith(1, "t1", "b2");
    expect(repository.list).toHaveBeenNthCalledWith(2, "t1", "b1");
    expect(repository.list).toHaveBeenNthCalledWith(3, "t1", undefined);
  });

  it("requires a branch and handles repository create failure", async () => {
    await expect(
      stationService.create({ ...auth, branchId: null }, { name: "G" }),
    ).rejects.toThrow("A branch is required");
    repository.create.mockResolvedValue(undefined);
    await expect(
      stationService.create(auth, { name: "G", branchId: "b2" }),
    ).rejects.toThrow("could not be created");
  });

  it("updates an existing station and rejects a missing one", async () => {
    repository.findById.mockResolvedValue(undefined);
    await expect(
      stationService.update(auth, "missing", { name: "X" }),
    ).rejects.toThrow("Kitchen station not found");
    repository.findById.mockResolvedValue({ id: "s1" });
    repository.update.mockResolvedValue({ id: "s1", name: "X" });
    await expect(
      stationService.update(auth, "s1", { name: "X" }),
    ).resolves.toMatchObject({ name: "X" });
  });

  it("removes an existing station and rejects a missing one", async () => {
    repository.remove.mockResolvedValue(undefined);
    await expect(stationService.remove(auth, "missing")).rejects.toThrow(
      "Kitchen station not found",
    );
    repository.remove.mockResolvedValue({ id: "s1" });
    await expect(stationService.remove(auth, "s1")).resolves.toBeUndefined();
  });

  it("lists routes and validates every routing resource", async () => {
    repository.listRoutes.mockResolvedValue([{ id: "r1" }]);
    await expect(stationService.listRoutes(auth, "i1")).resolves.toEqual([
      { id: "r1" },
    ]);
    for (const resources of [
      { item: null, station: { branchId: "b1" }, modifier: {} },
      { item: { branchId: null }, station: null, modifier: {} },
      { item: { branchId: null }, station: { branchId: "b1" }, modifier: null },
    ]) {
      repository.findRoutingResources.mockResolvedValue(resources);
      await expect(
        stationService.setRoute(auth, "i1", {
          stationId: "s1",
          modifierOptionId: "m1",
        }),
      ).rejects.toThrow("not found");
    }
  });

  it("sets valid item/default and modifier routes and removes them", async () => {
    repository.findRoutingResources.mockResolvedValue({
      item: { branchId: null },
      station: { branchId: "b1" },
      modifier: null,
    });
    repository.setRoute.mockResolvedValue({ id: "r1" });
    await expect(
      stationService.setRoute(auth, "i1", { stationId: "s1" }),
    ).resolves.toEqual({ id: "r1" });
    repository.findRoutingResources.mockResolvedValue({
      item: { branchId: "b1" },
      station: { branchId: "b1" },
      modifier: { id: "m1" },
    });
    await stationService.setRoute(auth, "i1", {
      stationId: "s1",
      modifierOptionId: "m1",
    });
    repository.removeRoute.mockResolvedValue({ id: "r1" });
    await expect(stationService.removeRoute(auth, "i1", "m1")).resolves.toEqual(
      { id: "r1" },
    );
  });
});
