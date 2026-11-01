import { franchiseQueryContextKey } from "@/shared/lib/query-context";

export const settingsKeys = {
  all: ["settings"] as const,
  tenant: (tenantId: string) =>
    [...settingsKeys.all, "tenant", tenantId] as const,
  approvalThresholds: () =>
    [
      ...settingsKeys.all,
      "approval-thresholds",
      ...franchiseQueryContextKey(),
    ] as const,
};
