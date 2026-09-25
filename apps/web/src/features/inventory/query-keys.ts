import { branchQueryContextKey } from "@/shared/lib/query-context";

export const inventoryKeys = {
  all: ["inventory"] as const,
  items: () =>
    [...inventoryKeys.all, ...branchQueryContextKey(), "items"] as const,
  lowStock: () => [...inventoryKeys.items(), "low-stock"] as const,
  impact: (inventoryItemId: string) =>
    [
      ...inventoryKeys.all,
      ...branchQueryContextKey(),
      "impact",
      inventoryItemId,
    ] as const,
  transactions: () =>
    [...inventoryKeys.all, ...branchQueryContextKey(), "transactions"] as const,
  wasteReasons: () =>
    [
      ...inventoryKeys.all,
      ...branchQueryContextKey(),
      "waste-reasons",
    ] as const,
};
