import { queryOptions } from "@tanstack/react-query";
import { settingsKeys } from "./query-keys";
import { settingsService } from "./services/settings.service";
import { approvalThresholdsService } from "./services/approval-thresholds.service";

export const tenantSettingsQuery = (tenantId: string, enabled = true) =>
  queryOptions({
    queryKey: settingsKeys.tenant(tenantId),
    queryFn: ({ signal }) => settingsService.getTenant(tenantId, signal),
    enabled: Boolean(tenantId) && enabled,
  });

export const approvalThresholdsQuery = () =>
  queryOptions({
    queryKey: settingsKeys.approvalThresholds(),
    queryFn: ({ signal }) => approvalThresholdsService.list(signal),
  });
