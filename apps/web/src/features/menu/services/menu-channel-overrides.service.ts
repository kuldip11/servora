import { createMenuApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

export interface ChannelOverrideRow {
  id: string;
  channel: string;
  fulfillmentType?: string | null;
  status?: string | null;
  isHidden: boolean;
}

const menuApi = createMenuApi(apiClient);

export const menuChannelOverridesService = {
  list: (itemId: string) =>
    menuApi.listChannelOverrides<ChannelOverrideRow>(itemId),
  save: (itemId: string, input: Record<string, unknown>) =>
    menuApi.saveChannelOverride<ChannelOverrideRow>(itemId, input),
  remove: menuApi.removeChannelOverride,
};
