import { useQuery } from "@tanstack/react-query";
import { fetchMyBranch } from "@/features/menu/api/branch";
import { menuKeys } from "@/features/menu/query/menu.keys";
import { getWaiterQueryScope } from "@/shared/lib/query-scope";

export const useMyBranch = () => {
  const scope = getWaiterQueryScope();
  return useQuery({
    queryKey: menuKeys.branch(scope),
    queryFn: (context) =>
      context?.signal ? fetchMyBranch(context.signal) : fetchMyBranch(),
  });
};
