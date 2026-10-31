import { useQuery } from "@tanstack/react-query";
import { fetchTables } from "@/features/menu/api/tables";
import { menuKeys } from "@/features/menu/query/menu.keys";
import { getWaiterQueryScope } from "@/shared/lib/query-scope";

export const useTables = (enabled: boolean) => {
  const scope = getWaiterQueryScope();
  return useQuery({
    queryKey: menuKeys.tables(scope),
    queryFn: (context) =>
      context?.signal ? fetchTables(context.signal) : fetchTables(),
    enabled,
    refetchInterval: 20_000,
  });
};
