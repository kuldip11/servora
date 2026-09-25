import { createMenuApi, type ModifierGroupPayload } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const menuApi = createMenuApi(apiClient);
export type { ModifierGroupPayload };

export const modifierGroupsService = {
  list: menuApi.listModifierGroups,
  save: menuApi.saveModifierGroup,
  remove: menuApi.removeModifierGroup,
  update: (groupId: string, patch: Record<string, unknown>) =>
    menuApi.updateModifierGroup(groupId, patch),
};
