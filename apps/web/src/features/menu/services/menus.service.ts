import type { ActiveMenuSummary } from "@/features/menu/types";
import { createMenuApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const menuApi = createMenuApi(apiClient);

export const menusService = {
  list: menuApi.listMenus,
  listActive: (orderType: string) =>
    menuApi.listActiveMenus<ActiveMenuSummary>(orderType),
  create: menuApi.createMenu,
  update: menuApi.updateMenu,
  publish: menuApi.publishMenu,
  unpublish: menuApi.unpublishMenu,
  remove: menuApi.removeMenu,
  assignItem: menuApi.assignItemToMenu,
  removeItem: menuApi.removeItemFromMenu,
};
