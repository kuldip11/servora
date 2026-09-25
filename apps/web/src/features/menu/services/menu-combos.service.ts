import { createMenuApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";
import type { ComboSummary } from "@/features/menu/components/combo-types";

const menuApi = createMenuApi(apiClient);

export const menuCombosService = {
  list: () => menuApi.listCombos<ComboSummary>(),
  create: (input: Record<string, unknown>) =>
    menuApi.createCombo<ComboSummary>(input),
  update: (id: string, input: Record<string, unknown>) =>
    menuApi.updateCombo<ComboSummary>(id, input),
  remove: (id: string) => menuApi.removeCombo(id),
};
