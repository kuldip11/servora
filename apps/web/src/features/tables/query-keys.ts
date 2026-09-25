import { branchQueryContextKey } from "@/shared/lib/query-context";

export const tableKeys = {
  all: ["tables"] as const,
  list: () => [...tableKeys.all, ...branchQueryContextKey(), "list"] as const,
  takeawayQr: (branchId: string) =>
    [
      ...tableKeys.all,
      ...branchQueryContextKey(),
      "takeaway-qr",
      branchId,
    ] as const,
};
