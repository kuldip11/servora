import { branchQueryContextKey } from "@/shared/lib/query-context";

export const auditKeys = {
  all: ["audit"] as const,
  list: () => [...auditKeys.all, "list", ...branchQueryContextKey()] as const,
  menuHistory: (entityType: string, changeType: string) =>
    [
      ...auditKeys.all,
      "menu-history",
      ...branchQueryContextKey(),
      entityType,
      changeType,
    ] as const,
};
