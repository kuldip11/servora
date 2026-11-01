import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("../../../../shared/lib/api-client", () => ({ apiClient: api }));

import { menuTemplatesService } from "@/features/menu/services/menu-templates.service";

describe("menuTemplatesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.post.mockResolvedValue({ data: { data: {} } });
  });

  it("lists and removes templates", async () => {
    const templates = [{ id: "tpl-1", name: "Lunch" }];
    api.get.mockResolvedValue({ data: { data: templates } });
    await expect(menuTemplatesService.list()).resolves.toEqual(templates);
    await menuTemplatesService.remove("tpl-1");
    expect(api.delete).toHaveBeenCalledWith("/menu/templates/tpl-1");
  });

  it("omits optional apply values when they are not supplied", async () => {
    await menuTemplatesService.apply("tpl-1", {});
    expect(api.post).toHaveBeenCalledWith("/menu/templates/tpl-1/apply", {});
  });

  it("saves a template from a category", async () => {
    const template = { id: "tpl-1", name: "Lunch" };
    api.post.mockResolvedValue({ data: { data: template } });
    await expect(
      menuTemplatesService.saveFromCategory("cat-1", {
        name: "Lunch",
        description: "",
      }),
    ).resolves.toEqual(template);
    expect(api.post).toHaveBeenCalledWith(
      "/menu/templates/from-category/cat-1",
      {
        name: "Lunch",
        description: "",
      },
    );
  });
});
