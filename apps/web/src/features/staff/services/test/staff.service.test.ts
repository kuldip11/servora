import { describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("../../../../shared/lib/api-client", () => ({ apiClient: api }));
import { staffService } from "@/features/staff/services/staff.service";
import { rolesService } from "@/features/staff/services/roles.service";
const input = {
  firstName: "A",
  lastName: "B",
  email: "a@b.com",
  password: "pw",
  roleId: "r1",
  branchId: "",
};

describe("staffService", () => {
  it("lists, adds, removes and updates staff", async () => {
    api.get.mockResolvedValue({
      data: {
        data: ["s"],
        pagination: { page: 1, limit: 25, total: 1, hasMore: false },
      },
    });
    api.post.mockResolvedValue({ data: { data: { id: "s1" } } });
    api.patch.mockResolvedValue({ data: { data: { id: "s1" } } });
    api.delete.mockResolvedValue({});
    await expect(staffService.list()).resolves.toEqual({
      items: ["s"],
      pagination: { page: 1, limit: 25, total: 1, hasMore: false },
    });
    await staffService.add(input);
    await staffService.remove("s1");
    await staffService.updateStatus("s1", "ACTIVE");
    await staffService.update("s1", { firstName: "New", branchIds: ["b1"] });
    expect(api.post).toHaveBeenCalledWith("/staff", {
      firstName: "A",
      lastName: "B",
      email: "a@b.com",
      password: "pw",
      roleId: "r1",
      branchIds: [],
    });
    expect(api.delete).toHaveBeenCalledWith("/staff/s1");
    expect(api.patch).toHaveBeenCalledWith("/staff/s1", { status: "ACTIVE" });
    expect(api.patch).toHaveBeenCalledWith("/staff/s1", {
      firstName: "New",
      branchIds: ["b1"],
    });
  });
});

describe("rolesService", () => {
  it("lists roles", async () => {
    api.get.mockResolvedValue({ data: { data: ["r"] } });
    await expect(rolesService.list()).resolves.toEqual(["r"]);
    expect(api.get).toHaveBeenCalledWith("/roles");
  });

  it("creates, updates and archives custom roles", async () => {
    api.post.mockResolvedValueOnce({ data: { data: { id: "r1" } } });
    api.patch.mockResolvedValueOnce({
      data: { data: { id: "r1", name: "Lead" } },
    });
    await rolesService.create({ name: "Lead", scope: "BRANCH" });
    await rolesService.update("r1", {
      name: "Lead",
      description: "Shift lead",
    });
    await rolesService.archive("r1");
    expect(api.post).toHaveBeenCalledWith("/roles", {
      name: "Lead",
      scope: "BRANCH",
    });
    expect(api.patch).toHaveBeenCalledWith("/roles/r1", {
      name: "Lead",
      description: "Shift lead",
    });
    expect(api.delete).toHaveBeenCalledWith("/roles/r1");
  });
});

it("sends the selected branch as branchIds", async () => {
  api.post.mockResolvedValue({ data: { data: { id: "s1" } } });
  await staffService.add({ ...input, branchId: "b1" });
  expect(api.post).toHaveBeenCalledWith(
    "/staff",
    expect.objectContaining({ branchIds: ["b1"] }),
  );
});
