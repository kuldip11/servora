import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tenantSettingsQuery } from "../query-options";
import { settingsKeys } from "../query-keys";
import {
  settingsService,
  type TenantSettingsUpdate,
} from "../services/settings.service";

export const useTenantSettings = (tenantId: string, enabled = true) =>
  useQuery(tenantSettingsQuery(tenantId, enabled));

export const useUpdateTenantSettings = (tenantId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TenantSettingsUpdate) =>
      settingsService.updateTenant(tenantId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: settingsKeys.tenant(tenantId),
      }),
  });
};
