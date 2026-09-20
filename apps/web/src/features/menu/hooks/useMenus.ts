import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/shared/lib/query-client";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { menuKeys } from "@/features/menu/query-keys";
import { menusService } from "@/features/menu/services/menus.service";

const invalidate = () =>
  queryClient.invalidateQueries({ queryKey: menuKeys.menus() });

export const useMenus = () => {
  return useQuery({
    queryKey: menuKeys.menus(),
    queryFn: menusService.list,
    staleTime: 60_000,
  });
};

export const useCreateMenu = () => {
  return useMutation({
    mutationFn: menusService.create,
    onSuccess: () => {
      invalidate();
      notifySuccess("Menu created");
    },
  });
};

export const useUpdateMenu = () => {
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Parameters<typeof menusService.update>[1];
    }) => menusService.update(id, input),
    onSuccess: () => {
      invalidate();
      notifySuccess("Menu availability updated");
    },
  });
};

export const useSetMenuPublished = () => {
  return useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      published ? menusService.publish(id) : menusService.unpublish(id),
    onSuccess: invalidate,
    onError: (error) => notifyError(error, "Failed to update menu"),
  });
};

export const useDeleteMenu = () => {
  return useMutation({
    mutationFn: menusService.remove,
    onSuccess: () => {
      invalidate();
      notifySuccess("Menu deleted");
    },
    onError: (error) => notifyError(error, "Failed to delete menu"),
  });
};
