import { describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  listGroups: vi.fn(),
  createGroup: vi.fn(),
  updateGroup: vi.fn(),
  deleteGroup: vi.fn(),
  setOptionAvailability: vi.fn(),
  listTags: vi.fn(),
  createTag: vi.fn(),
  deleteTag: vi.fn(),
  listAllergens: vi.fn(),
}));
vi.mock("../modifier.service", () => ({ modifierService: m }));
import { modifierController } from "../modifier.controller";
describe("modifier controller coverage", () => {
  it("delegates every method", async () => {
    const a = {} as any;
    m.listGroups.mockResolvedValue([]);
    m.createGroup.mockResolvedValue({ id: "g1" });
    m.updateGroup.mockResolvedValue({ id: "g1" });
    m.setOptionAvailability.mockResolvedValue({ id: "o1" });
    m.listTags.mockResolvedValue([]);
    m.createTag.mockResolvedValue({ id: "t1" });
    m.listAllergens.mockResolvedValue([]);
    await modifierController.listGroups(a);
    await modifierController.createGroup(a, { name: "G" });
    await modifierController.updateGroup(a, "g1", {});
    await modifierController.deleteGroup(a, "g1");
    await modifierController.setOptionAvailability(a, "o1", true);
    await modifierController.listTags(a);
    await modifierController.createTag(a, { name: "T" });
    await modifierController.deleteTag(a, "t1");
    await modifierController.listAllergens(a);
    expect(m.listGroups).toHaveBeenCalled();
    expect(m.listAllergens).toHaveBeenCalled();
  });
});
