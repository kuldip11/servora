import { franchiseQueryContextKey } from "@/shared/lib/query-context";

export const staffKeys = {
  all: ["staff"] as const,
  list: () =>
    [...staffKeys.all, ...franchiseQueryContextKey(), "list"] as const,
};

export const roleKeys = {
  all: ["roles"] as const,
  list: () => [...roleKeys.all, ...franchiseQueryContextKey(), "list"] as const,
  permissions: (roleId: string | null) =>
    [
      ...roleKeys.all,
      ...franchiseQueryContextKey(),
      "permissions",
      roleId,
    ] as const,
};
