import { createMenuApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const menuApi = createMenuApi(apiClient);

export const menuCombosService = {
  list: () => menuApi.listCombos(),
  create: (input: Record<string, unknown>) => menuApi.createCombo(input),
  update: (id: string, input: Record<string, unknown>) =>
    menuApi.updateCombo(id, input),
  remove: (id: string) => menuApi.removeCombo(id),
};
