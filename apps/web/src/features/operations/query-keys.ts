import { branchQueryContextKey } from "@/shared/lib/query-context";

export const operationsKeys = {
  all: ["operations"] as const,
  snapshot: () =>
    [...operationsKeys.all, ...branchQueryContextKey(), "snapshot"] as const,
};
