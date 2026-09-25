import { useQuery } from "@tanstack/react-query";
import { activeMenusQuery } from "@/features/menu/query-options";

export const useActiveMenus = (
  orderType: string,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    ...activeMenusQuery(orderType),
    ...(options?.enabled !== undefined && { enabled: options.enabled }),
  });
};
