import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notifyError } from "@/shared/lib/notify";
import { tablesService } from "@/features/tables/services/tables.service";
import { tableKeys } from "@/features/tables/query-keys";
import type { RestaurantTable } from "@/features/tables/types";

export const useUpdateTableStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: RestaurantTable["status"];
    }) => tablesService.updateStatus(id, status),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: tableKeys.list() }),
    onError: (err) => notifyError(err, "Failed to update status"),
  });
};
