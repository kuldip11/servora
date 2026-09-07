import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  findModifierGroups: vi.fn(),
  createModifierGroup: vi.fn(),
  findModifierGroup: vi.fn(),
  findModifierOption: vi.fn(),
  updateModifierGroup: vi.fn(),
  setModifierGroupOptions: vi.fn(),
  findEligibleVariantIdsForGroup: vi.fn(),
  deleteModifierGroup: vi.fn(),
  setOptionAvailability: vi.fn(),
  findTags: vi.fn(),
  createTag: vi.fn(),
  deleteTag: vi.fn(),
  findAllergens: vi.fn(),
  requirePermission: vi.fn(),
  resolveMenuBranch: vi.fn(),
  assertMenuResourceBranch: vi.fn(),
  record: vi.fn(),
  buildDiff: vi.fn(),
}));
vi.mock("../modifier.repository", () => ({
  modifierRepository: {
    findModifierGroups: m.findModifierGroups,
    createModifierGroup: m.createModifierGroup,
    findModifierGroup: m.findModifierGroup,
    findModifierOption: m.findModifierOption,
    updateModifierGroup: m.updateModifierGroup,
    setModifierGroupOptions: m.setModifierGroupOptions,
    findEligibleVariantIdsForGroup: m.findEligibleVariantIdsForGroup,
    deleteModifierGroup: m.deleteModifierGroup,
    setOptionAvailability: m.setOptionAvailability,
    findTags: m.findTags,
    createTag: m.createTag,
    deleteTag: m.deleteTag,
    findAllergens: m.findAllergens,
  },
}));
vi.mock("@/core/auth", () => ({ requirePermission: m.requirePermission }));
vi.mock("@/modules/menu/menu-authorization", () => ({
  resolveMenuBranch: m.resolveMenuBranch,
  assertMenuResourceBranch: m.assertMenuResourceBranch,
}));
vi.mock("@/modules/menu/change-log/menu-change-log", () => ({
  buildDiff: m.buildDiff,
  menuChangeLog: { record: m.record },
}));
import { modifierService } from "../modifier.service";
const auth = { tenantId: "t1", branchId: "b1", userId: "u1" } as any;
beforeEach(() => {
  vi.clearAllMocks();
  m.resolveMenuBranch.mockReturnValue("b1");
  m.findModifierGroup.mockResolvedValue({
    id: "g1",
    branchId: "b1",
    dependsOnOptionId: null,
    groupType: "ADDON",
  });
  m.createModifierGroup.mockResolvedValue({ id: "g1", branchId: "b1" });
  m.updateModifierGroup.mockResolvedValue({
    id: "g1",
    branchId: "b1",
    groupType: "ADDON",
  });
  m.findEligibleVariantIdsForGroup.mockResolvedValue(new Set(["v1", "v2"]));
  m.setOptionAvailability.mockResolvedValue({ id: "o1", isAvailable: true });
  m.findModifierOption.mockResolvedValue({
    id: "o1",
    branchId: "b1",
    modifierGroupId: "g2",
  });
  m.findTags.mockResolvedValue([]);
  m.createTag.mockResolvedValue({ id: "t1" });
  m.findAllergens.mockResolvedValue([]);
  m.record.mockResolvedValue(undefined);
  m.buildDiff.mockReturnValue({});
});
describe("modifier service comprehensive coverage", () => {
  it("lists groups using resolved branch", async () => {
    await modifierService.listGroups(auth);
    expect(m.requirePermission).toHaveBeenCalledWith(auth, "menu:read");
    expect(m.findModifierGroups).toHaveBeenCalledWith("t1", "b1");
    m.resolveMenuBranch.mockReturnValueOnce(null);
    await modifierService.listGroups({ ...auth, branchId: null });
    expect(m.findModifierGroups).toHaveBeenLastCalledWith("t1", undefined);
  });
  it("creates valid groups and normalizes prices", async () => {
    await modifierService.createGroup(auth, {
      name: "G",
      options: [{ name: "A", additionalPrice: 2 }],
    });
    expect(m.createModifierGroup).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "t1",
        branchId: "b1",
        options: [expect.objectContaining({ additionalPrice: "2" })],
      }),
    );
  });
  it("rejects invalid create prices, variant prices, and missing create row", async () => {
    await expect(
      modifierService.createGroup(auth, {
        name: "G",
        options: [{ name: "A", additionalPrice: -1 }],
      }),
    ).rejects.toThrow("cannot be negative");
    await expect(
      modifierService.createGroup(auth, {
        name: "G",
        options: [
          {
            name: "A",
            additionalPrice: 1,
            variantPrices: [{ variantId: "v1", additionalPrice: 2 }],
          },
        ],
      }),
    ).rejects.toThrow("Create the modifier group first");
    m.createModifierGroup.mockResolvedValueOnce(undefined);
    await expect(
      modifierService.createGroup(auth, { name: "G" }),
    ).rejects.toThrow("could not be created");
  });
  it("updates groups with dependency traversal and options", async () => {
    m.findModifierOption
      .mockResolvedValueOnce({
        id: "o1",
        modifierGroupId: "g2",
        branchId: "b1",
      })
      .mockResolvedValueOnce({
        id: "o2",
        modifierGroupId: "g3",
        branchId: "b1",
      });
    m.findModifierGroup
      .mockResolvedValueOnce({
        id: "g1",
        branchId: "b1",
        dependsOnOptionId: null,
        groupType: "ADDON",
      })
      .mockResolvedValueOnce({ id: "g2", dependsOnOptionId: "o2" })
      .mockResolvedValueOnce({ id: "g3", dependsOnOptionId: null });
    await modifierService.updateGroup(auth, "g1", {
      dependsOnOptionId: "o1",
      options: [
        {
          name: "A",
          additionalPrice: 1,
          variantPrices: [{ variantId: "v1", additionalPrice: 2 }],
        },
      ],
    });
    expect(m.setModifierGroupOptions).toHaveBeenCalled();
  });
  it("rejects missing groups, missing prerequisite options, circular dependencies, negative addon prices, duplicate/invalid variant price targets", async () => {
    m.findModifierGroup.mockResolvedValueOnce(undefined);
    await expect(
      modifierService.updateGroup(auth, "missing", {}),
    ).rejects.toThrow();
    m.findModifierGroup.mockResolvedValueOnce({
      id: "g1",
      branchId: "b1",
      groupType: "ADDON",
    });
    m.findModifierOption.mockResolvedValueOnce(undefined);
    await expect(
      modifierService.updateGroup(auth, "g1", { dependsOnOptionId: "bad" }),
    ).rejects.toThrow();
    m.findModifierGroup.mockResolvedValueOnce({
      id: "g1",
      branchId: "b1",
      groupType: "ADDON",
    });
    m.findModifierOption.mockResolvedValueOnce({
      id: "o1",
      modifierGroupId: "g1",
      branchId: "b1",
    });
    await expect(
      modifierService.updateGroup(auth, "g1", { dependsOnOptionId: "o1" }),
    ).rejects.toThrow("Circular");
    m.findModifierGroup.mockResolvedValueOnce({
      id: "g1",
      branchId: "b1",
      groupType: "ADDON",
    });
    await expect(
      modifierService.updateGroup(auth, "g1", {
        options: [{ name: "A", additionalPrice: -1 }],
      }),
    ).rejects.toThrow("cannot be negative");
    m.findModifierGroup.mockResolvedValueOnce({
      id: "g1",
      branchId: "b1",
      groupType: "ADDON",
    });
    await expect(
      modifierService.updateGroup(auth, "g1", {
        options: [
          {
            name: "A",
            additionalPrice: 1,
            variantPrices: [{ variantId: "v1", additionalPrice: -1 }],
          },
        ],
      }),
    ).rejects.toThrow("variant-specific");
    m.findModifierGroup.mockResolvedValueOnce({
      id: "g1",
      branchId: "b1",
      groupType: "ADDON",
    });
    await expect(
      modifierService.updateGroup(auth, "g1", {
        options: [
          {
            name: "A",
            additionalPrice: 1,
            variantPrices: [
              { variantId: "v1", additionalPrice: 1 },
              { variantId: "v1", additionalPrice: 2 },
            ],
          },
        ],
      }),
    ).rejects.toThrow("only one price override");
    m.findModifierGroup.mockResolvedValueOnce({
      id: "g1",
      branchId: "b1",
      groupType: "ADDON",
    });
    m.findEligibleVariantIdsForGroup.mockResolvedValueOnce(new Set());
    await expect(
      modifierService.updateGroup(auth, "g1", {
        options: [
          {
            name: "A",
            additionalPrice: 1,
            variantPrices: [{ variantId: "bad", additionalPrice: 1 }],
          },
        ],
      }),
    ).rejects.toThrow("can only target variants");
  });
  it("allows substitution negative prices and handles absent options/update row", async () => {
    m.findModifierGroup.mockResolvedValueOnce({
      id: "g1",
      branchId: "b1",
      groupType: "SUBSTITUTION",
    });
    await modifierService.updateGroup(auth, "g1", {
      groupType: "SUBSTITUTION",
      options: [
        {
          name: "Sub",
          additionalPrice: -1,
          variantPrices: [{ variantId: "v1", additionalPrice: -2 }],
        },
      ],
    });
    m.findModifierGroup.mockResolvedValueOnce({
      id: "g1",
      branchId: "b1",
      groupType: "ADDON",
    });
    await modifierService.updateGroup(auth, "g1", {});
    expect(m.setModifierGroupOptions).toHaveBeenCalledTimes(1);
    m.findModifierGroup.mockResolvedValueOnce({
      id: "g1",
      branchId: "b1",
      groupType: "ADDON",
    });
    m.updateModifierGroup.mockResolvedValueOnce(undefined);
    await expect(modifierService.updateGroup(auth, "g1", {})).rejects.toThrow();
  });
  it("covers null dependency, default addon fallbacks, option price absence, and mixed variant price lists", async () => {
    m.findModifierGroup.mockResolvedValueOnce({
      id: "g1",
      branchId: "b1",
      groupType: undefined,
      dependsOnOptionId: null,
    });
    await modifierService.updateGroup(auth, "g1", {
      dependsOnOptionId: null,
      options: [{ name: "Plain", additionalPrice: 0 }],
    });
    m.findModifierGroup.mockResolvedValueOnce({
      id: "g1",
      branchId: "b1",
      groupType: undefined,
      dependsOnOptionId: null,
    });
    m.findEligibleVariantIdsForGroup.mockResolvedValueOnce(new Set(["v1"]));
    await modifierService.updateGroup(auth, "g1", {
      options: [
        {
          name: "Variant",
          additionalPrice: 0,
          variantPrices: [{ variantId: "v1", additionalPrice: 0 }],
        },
        { name: "Plain", additionalPrice: 0 },
      ],
    });
  });

  it("deletes groups including missing no-op", async () => {
    m.findModifierGroup.mockResolvedValueOnce(undefined);
    await modifierService.deleteGroup(auth, "g1");
    expect(m.deleteModifierGroup).not.toHaveBeenCalled();
    m.findModifierGroup.mockResolvedValueOnce({ id: "g1", branchId: "b1" });
    await modifierService.deleteGroup(auth, "g1");
    expect(m.deleteModifierGroup).toHaveBeenCalledWith("t1", "g1");
  });
  it("sets option availability and guards missing options/update", async () => {
    await expect(
      modifierService.setOptionAvailability(auth, "o1", true),
    ).resolves.toMatchObject({ id: "o1" });
    m.findModifierOption.mockResolvedValueOnce(undefined);
    await expect(
      modifierService.setOptionAvailability(auth, "bad", false),
    ).rejects.toThrow();
    m.findModifierOption.mockResolvedValueOnce({
      id: "o1",
      branchId: "b1",
      modifierGroupId: "g1",
    });
    m.setOptionAvailability.mockResolvedValueOnce(undefined);
    await expect(
      modifierService.setOptionAvailability(auth, "o1", false),
    ).rejects.toThrow();
  });
  it("lists/creates/deletes tags and allergens", async () => {
    await modifierService.listTags(auth);
    await modifierService.createTag(auth, { name: "Hot" });
    await modifierService.createTag(auth, { name: "Cool", color: "#fff" });
    await modifierService.deleteTag(auth, "t1");
    await modifierService.listAllergens();
    expect(m.findAllergens).toHaveBeenCalled();
  });
});
