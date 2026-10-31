import { branchQueryContextKey } from "@/shared/lib/query-context";

export const differentiatorKeys = {
  all: ["differentiators"] as const,
  menuChoices: () =>
    [
      ...differentiatorKeys.all,
      "menu-choices",
      ...branchQueryContextKey(),
    ] as const,
  availability: (channel: string, fulfillment: string, cause: string) =>
    [
      ...differentiatorKeys.all,
      "availability",
      ...branchQueryContextKey(),
      channel,
      fulfillment,
      cause,
    ] as const,
  engineering: (windowDays: string) =>
    [
      ...differentiatorKeys.all,
      "engineering",
      ...branchQueryContextKey(),
      windowDays,
    ] as const,
};
