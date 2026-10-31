import { useQuery } from "@tanstack/react-query";
import type { MenuFulfillmentTypeDto } from "@pos/api-client";
import { activeMenusQuery } from "@/features/menu/query-options";

export const useActiveMenus = (
  orderType: MenuFulfillmentTypeDto,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    ...activeMenusQuery(orderType),
    ...(options?.enabled !== undefined && { enabled: options.enabled }),
  });
};
