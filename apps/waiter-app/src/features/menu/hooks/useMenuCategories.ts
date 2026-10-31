import { useQuery } from "@tanstack/react-query";
import { fetchCategories } from "@/features/menu/api/menu";
import { menuKeys } from "@/features/menu/query/menu.keys";
import { getWaiterQueryScope } from "@/shared/lib/query-scope";

export const useMenuCategories = () => {
  const scope = getWaiterQueryScope();
  return useQuery({
    queryKey: menuKeys.categories(scope),
    queryFn: (context) =>
      context?.signal ? fetchCategories(context.signal) : fetchCategories(),
  });
};
