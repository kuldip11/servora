import {
  useQueryClient,
  type QueryClient,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { menuKeys } from "@/features/menu/query-keys";
import { menusService } from "@/features/menu/services/menus.service";
import { queryFreshness } from "@/shared/lib/query-policy";

const invalidate = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ queryKey: menuKeys.menus() });

export const useMenus = () => {
  return useQuery({
    queryKey: menuKeys.menus(),
    queryFn: menusService.list,
    staleTime: queryFreshness.transactional,
  });
};

export const useCreateMenu = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: menusService.create,
    onSuccess: () => {
      invalidate(queryClient);
      notifySuccess("Menu created");
    },
  });
};

export const useUpdateMenu = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Parameters<typeof menusService.update>[1];
    }) => menusService.update(id, input),
    onSuccess: () => {
      invalidate(queryClient);
      notifySuccess("Menu availability updated");
    },
  });
};

export const useSetMenuPublished = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      published ? menusService.publish(id) : menusService.unpublish(id),
    onSuccess: () => invalidate(queryClient),
    onError: (error) => notifyError(error, "Failed to update menu"),
  });
};

export const useDeleteMenu = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: menusService.remove,
    onSuccess: () => {
      invalidate(queryClient);
      notifySuccess("Menu deleted");
    },
    onError: (error) => notifyError(error, "Failed to delete menu"),
  });
};

export const useUpdateMenuMembership = (itemId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (change: {
      menuId: string;
      categoryId: string | null;
    }) => {
      if (change.categoryId) {
        await menusService.assignItem(itemId, {
          menuId: change.menuId,
          categoryId: change.categoryId,
        });
      } else {
        await menusService.removeItem(itemId, change.menuId);
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: menuKeys.categories() }),
    onError: (error) => notifyError(error, "Failed to update menu assignment"),
  });
};
