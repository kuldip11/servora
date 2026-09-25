import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  invalidate: vi.fn(async () => undefined),
  createCombo: vi.fn(),
  updateCombo: vi.fn(),
  removeCombo: vi.fn(),
  createStation: vi.fn(),
  removeStation: vi.fn(),
  setRoute: vi.fn(),
  removeRoute: vi.fn(),
  updateVariant: vi.fn(),
  setStock: vi.fn(),
  createPriceRule: vi.fn(),
  removePriceRule: vi.fn(),
  saveChannelOverride: vi.fn(),
  removeChannelOverride: vi.fn(),
  updateModifierGroup: vi.fn(),
}));

vi.mock("@/store/auth", () => ({
  useAuthStore: { getState: () => ({ franchiseId: "fr-1", branchId: "br-1" }) },
}));
vi.mock("@/shared/lib/query-client", () => ({
  queryClient: { invalidateQueries: h.invalidate },
}));
vi.mock("@/shared/lib/notify", () => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock("@/features/menu/services/menu-combos.service", () => ({
  menuCombosService: {
    list: vi.fn(),
    create: h.createCombo,
    update: h.updateCombo,
    remove: h.removeCombo,
  },
}));
vi.mock("@/features/menu/services/kitchen-stations.service", () => ({
  kitchenStationsService: {
    list: vi.fn(),
    routes: vi.fn(),
    create: h.createStation,
    remove: h.removeStation,
    setRoute: h.setRoute,
    removeRoute: h.removeRoute,
  },
}));
vi.mock("@/features/menu/services/menu-items.service", () => ({
  menuItemsService: {
    updateVariantAvailability: h.updateVariant,
    setManualStockCount: h.setStock,
  },
}));
vi.mock("@/features/menu/services/menu-pricing.service", () => ({
  menuPricingService: {
    list: vi.fn(),
    create: h.createPriceRule,
    remove: h.removePriceRule,
    createHappyHour: vi.fn(),
  },
}));
vi.mock("@/features/menu/services/menu-channel-overrides.service", () => ({
  menuChannelOverridesService: {
    list: vi.fn(),
    save: h.saveChannelOverride,
    remove: h.removeChannelOverride,
  },
}));
vi.mock("@/features/menu/services/modifier-groups.service", () => ({
  modifierGroupsService: {
    update: h.updateModifierGroup,
  },
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: h.invalidate }),
  useQuery: vi.fn(),
  useMutation: (config: any) => config,
}));

import { useDeleteCombo, useSaveCombo } from "../useCombos";
import {
  useCreateKitchenStation,
  useDeleteKitchenStation,
  useSetItemStationRoute,
} from "../useKitchenStations";
import {
  useSetVariantStockCount,
  useUpdateVariantAvailability,
} from "../useVariantAvailability";
import {
  useDeletePerCoverPriceRule,
  useSavePerCoverPriceRule,
} from "../useBuffetPricing";
import {
  useDeleteChannelOverride,
  useSaveChannelOverride,
} from "../useChannelOverrides";
import { useSaveVariantModifierPricing } from "../useSaveVariantModifierPricing";

const scoped = (tail: string[]) => [
  "menu",
  "branch-context",
  "fr-1",
  "br-1",
  ...tail,
];

describe("menu mutation cache policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.createCombo.mockResolvedValue({ id: "c1" });
    h.updateCombo.mockResolvedValue({ id: "c1" });
    h.removeCombo.mockResolvedValue(undefined);
    h.createStation.mockResolvedValue({ id: "s1" });
    h.removeStation.mockResolvedValue(undefined);
    h.setRoute.mockResolvedValue(undefined);
    h.removeRoute.mockResolvedValue(undefined);
    h.updateVariant.mockResolvedValue(undefined);
    h.setStock.mockResolvedValue(undefined);
    h.createPriceRule.mockResolvedValue({ id: "p1" });
    h.removePriceRule.mockResolvedValue(undefined);
    h.saveChannelOverride.mockResolvedValue({ id: "co1" });
    h.removeChannelOverride.mockResolvedValue(undefined);
    h.updateModifierGroup.mockResolvedValue({ id: "g1" });
  });

  it("invalidates only the scoped combo key", async () => {
    const save = useSaveCombo() as any;
    await save.mutationFn({ input: { name: "Combo" } });
    await save.onSuccess();
    const remove = useDeleteCombo() as any;
    await remove.mutationFn("c1");
    await remove.onSuccess();
    expect(h.invalidate).toHaveBeenCalledWith({ queryKey: scoped(["combos"]) });
  });

  it("invalidates scoped station and route keys", async () => {
    const create = useCreateKitchenStation() as any;
    await create.mutationFn({ name: "Grill" });
    await create.onSuccess();
    const remove = useDeleteKitchenStation() as any;
    await remove.mutationFn("s1");
    await remove.onSuccess();
    const route = useSetItemStationRoute("i1") as any;
    await route.mutationFn({ stationId: "s1" });
    await route.onSuccess();
    expect(h.invalidate).toHaveBeenCalledWith({
      queryKey: scoped(["kitchen-stations"]),
    });
    expect(h.invalidate).toHaveBeenCalledWith({
      queryKey: scoped(["kitchen-stations", "routes", "i1"]),
    });
  });

  it("invalidates only menu categories for variant changes", async () => {
    const availability = useUpdateVariantAvailability() as any;
    await availability.mutationFn({ id: "v1", unavailable: true });
    await availability.onSuccess();
    const stock = useSetVariantStockCount("i1") as any;
    await stock.mutationFn({ variantId: "v1", count: 3 });
    await stock.onSuccess();
    expect(h.invalidate).toHaveBeenCalledWith({
      queryKey: scoped(["categories"]),
    });
  });
  it("invalidates only scoped buffet pricing keys", async () => {
    const save = useSavePerCoverPriceRule() as any;
    await save.mutationFn({ tier: "ADULT", price: 499 });
    await save.onSuccess();
    const remove = useDeletePerCoverPriceRule() as any;
    await remove.mutationFn("p1");
    await remove.onSuccess();
    expect(h.invalidate).toHaveBeenCalledWith({
      queryKey: scoped(["per-cover-price-rules"]),
    });
  });

  it("invalidates only the current item channel override key", async () => {
    const save = useSaveChannelOverride("i1") as any;
    await save.mutationFn({ channel: "STAFF" });
    await save.onSuccess();
    const remove = useDeleteChannelOverride("i1") as any;
    await remove.mutationFn("co1");
    await remove.onSuccess();
    expect(h.invalidate).toHaveBeenCalledWith({
      queryKey: scoped(["channel-overrides", "i1"]),
    });
  });

  it("invalidates only modifier groups for variant-specific modifier pricing", async () => {
    const save = useSaveVariantModifierPricing() as any;
    await save.mutationFn({ groupId: "g1", patch: { options: [] } });
    await save.onSuccess();
    expect(h.invalidate).toHaveBeenCalledWith({
      queryKey: scoped(["modifier-groups"]),
    });
  });
});
