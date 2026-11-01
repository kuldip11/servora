import type { QueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";

// Capture the mutation's context before the request starts. A branch switch
// while the request is in flight must not invalidate a different franchise.
export const menuMutationSync = (queryClient: QueryClient) => {
  const { franchiseId } = useAuthStore.getState();
  const invalidate = (branchId?: string) =>
    queryClient.invalidateQueries({
      predicate: ({ queryKey: key }) => {
        if (key[2] !== franchiseId) return false;
        if (key[0] === "menu" && key[1] === "franchise") {
          return key[3] === "menus";
        }
        if (key[1] !== "branch-context") return false;
        if (branchId !== undefined && key[3] !== branchId) return false;
        if (key[0] === "availability") return key[4] === "dashboard";
        return (
          key[0] === "menu" &&
          (key[4] === "categories" || key[4] === "active-menus")
        );
      },
    });
  return { invalidate };
};
