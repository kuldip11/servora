import { useMutation, useQuery } from "@tanstack/react-query";
import { kitchenStationsService } from "@/features/menu/services/kitchen-stations.service";
import { queryClient } from "@/shared/lib/query-client";
import { notifyError } from "@/shared/lib/notify";

export const useKitchenStations = () =>
  useQuery({
    queryKey: ["kitchen-stations"],
    queryFn: kitchenStationsService.list,
  });
export const useItemStationRoutes = (itemId: string) =>
  useQuery({
    queryKey: ["kitchen-stations", "routes", itemId],
    queryFn: () => kitchenStationsService.routes(itemId),
    enabled: !!itemId,
  });
export const useCreateKitchenStation = () => {
  return useMutation({
    mutationFn: kitchenStationsService.create,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["kitchen-stations"] }),
  });
};
export const useDeleteKitchenStation = () => {
  return useMutation({
    mutationFn: kitchenStationsService.remove,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["kitchen-stations"] }),
    onError: (error) => notifyError(error, "Failed to delete kitchen station"),
  });
};
export const useSetItemStationRoute = (itemId: string) => {
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
        queryKey: ["kitchen-stations", "routes", itemId],
      }),
    onError: (error) => notifyError(error, "Failed to update kitchen routing"),
  });
};
