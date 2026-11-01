import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { kitchenStationsService } from "@/features/menu/services/kitchen-stations.service";
import { notifyError } from "@/shared/lib/notify";
import { menuKeys } from "@/features/menu/query-keys";
import {
  itemStationRoutesQuery,
  kitchenStationsQuery,
} from "@/features/menu/query-options";

export const useKitchenStations = () => useQuery(kitchenStationsQuery());
export const useItemStationRoutes = (itemId: string) =>
  useQuery({ ...itemStationRoutesQuery(itemId), enabled: !!itemId });
export const useCreateKitchenStation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: kitchenStationsService.create,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: menuKeys.kitchenStations() }),
  });
};
export const useDeleteKitchenStation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: kitchenStationsService.remove,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: menuKeys.kitchenStations() }),
    onError: (error) => notifyError(error, "Failed to delete kitchen station"),
  });
};
export const useSetItemStationRoute = (itemId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      stationId: string | null;
      modifierOptionId?: string | null;
    }) => {
      if (input.stationId)
        await kitchenStationsService.setRoute(
          itemId,
          input.stationId,
          input.modifierOptionId,
        );
      else
        await kitchenStationsService.removeRoute(
          itemId,
          input.modifierOptionId,
        );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: menuKeys.stationRoutes(itemId),
      }),
    onError: (error) => notifyError(error, "Failed to update kitchen routing"),
  });
};
