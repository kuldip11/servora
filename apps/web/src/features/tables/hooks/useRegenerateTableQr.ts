import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { tablesService } from "@/features/tables/services/tables.service";
import { tableKeys } from "@/features/tables/query-keys";

export const useRegenerateTableQr = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tablesService.regenerateQr(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tableKeys.list() });
      notifySuccess("Table QR code regenerated");
    },
    onError: (err) => notifyError(err, "Failed to regenerate QR code"),
  });
};
