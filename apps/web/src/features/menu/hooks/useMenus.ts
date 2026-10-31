import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { menuKeys } from "@/features/menu/query-keys";
import { menusService } from "@/features/menu/services/menus.service";
import { queryFreshness } from "@/shared/lib/query-policy";

import { menuMutationSync } from "@/features/menu/query-sync";

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
    onMutate: () => menuMutationSync(queryClient),
    mutationFn: menusService.create,
    onSuccess: async (_data, _variables, sync) => {
      await sync?.invalidate();
      notifySuccess("Menu created");
    },
  });
};

export const useUpdateMenu = () => {
  const queryClient = useQueryClient();
  return useMutation({
    onMutate: () => menuMutationSync(queryClient),
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Parameters<typeof menusService.update>[1];
    }) => menusService.update(id, input),
    onSuccess: async (_data, _variables, sync) => {
      await sync?.invalidate();
      notifySuccess("Menu availability updated");
    },
  });
};

export const useSetMenuPublished = () => {
  const queryClient = useQueryClient();
  return useMutation({
    onMutate: () => menuMutationSync(queryClient),
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      published ? menusService.publish(id) : menusService.unpublish(id),
    onSuccess: (_data, _variables, sync) => sync?.invalidate(),
    onError: (error) => notifyError(error, "Failed to update menu"),
  });
};

export const useDeleteMenu = () => {
  const queryClient = useQueryClient();
  return useMutation({
    onMutate: () => menuMutationSync(queryClient),
    mutationFn: menusService.remove,
    onSuccess: async (_data, _variables, sync) => {
      await sync?.invalidate();
      notifySuccess("Menu deleted");
    },
    onError: (error) => notifyError(error, "Failed to delete menu"),
  });
};

export const useUpdateMenuMembership = (itemId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    onMutate: () => menuMutationSync(queryClient),
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
    onSuccess: (_data, _variables, sync) => sync?.invalidate(),
    onError: (error) => notifyError(error, "Failed to update menu assignment"),
  });
};
