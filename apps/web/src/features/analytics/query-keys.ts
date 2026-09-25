import { branchQueryContextKey } from "@/shared/lib/query-context";

export const analyticsKeys = {
  all: ["analytics"] as const,
  dashboard: () =>
    [...analyticsKeys.all, ...branchQueryContextKey(), "dashboard"] as const,
  costMargin: (categoryId?: string) =>
    [
      ...analyticsKeys.all,
      ...branchQueryContextKey(),
      "cost-margin",
      categoryId ?? "all",
    ] as const,
  menuEngineering: (windowDays: number) =>
    [
      ...analyticsKeys.all,
      ...branchQueryContextKey(),
      "menu-engineering",
      windowDays,
    ] as const,
};
