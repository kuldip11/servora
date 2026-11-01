import type { AuthContext } from "@/core/auth";
import { requirePermission } from "@/core/auth";
import {
  buildDiff,
  menuChangeLog,
} from "@/modules/menu/change-log/menu-change-log";
import { modifierRepository } from "./modifier.repository";
import type { CreateTagInput } from "./modifier.types";

export const modifierCatalogService = {
  async listTags(auth: AuthContext) {
    requirePermission(auth, "menu:read");
    return modifierRepository.findTags(auth.tenantId);
  },

  async createTag(auth: AuthContext, input: CreateTagInput) {
    requirePermission(auth, "menu:create");
    const created = await modifierRepository.createTag(
      auth.tenantId,
      input.name,
      input.color,
    );
    await menuChangeLog.record(
      auth,
      "TAG",
      created.id,
      "CREATED",
      buildDiff(null, created),
    );
    return created;
  },

  async deleteTag(auth: AuthContext, tagId: string) {
    requirePermission(auth, "menu:delete");
    await modifierRepository.deleteTag(auth.tenantId, tagId);
    await menuChangeLog.record(auth, "TAG", tagId, "DELETED", {});
  },

  async listAllergens() {
    return modifierRepository.findAllergens();
  },
};
