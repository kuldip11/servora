import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { tablesService } from "@/features/tables/services/tables.service";
import { tableKeys } from "@/features/tables/query-keys";

export const useDeleteTable = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tablesService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tableKeys.list() });
      notifySuccess("Table removed");
    },
    onError: (err) => notifyError(err, "Failed to remove table"),
  });
};
