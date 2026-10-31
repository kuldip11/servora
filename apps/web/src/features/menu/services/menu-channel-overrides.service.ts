import { createMenuApi, type MenuChannelOverrideDto } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

export type ChannelOverrideRow = MenuChannelOverrideDto;

const menuApi = createMenuApi(apiClient);

export const menuChannelOverridesService = {
  list: (itemId: string) => menuApi.listChannelOverrides(itemId),
  save: (
    itemId: string,
    input: Parameters<typeof menuApi.saveChannelOverride>[1],
  ) => menuApi.saveChannelOverride(itemId, input),
  remove: menuApi.removeChannelOverride,
};
