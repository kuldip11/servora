import { branchQueryContextKey } from "@/shared/lib/query-context";

export const availabilityKeys = {
  all: ["availability"] as const,
  dashboard: (channel: string, fulfillmentType: string, cause?: string) =>
    [
      ...availabilityKeys.all,
      ...branchQueryContextKey(),
      "dashboard",
      channel,
      fulfillmentType,
      cause ?? "all",
    ] as const,
};
