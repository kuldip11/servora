import { useQueryClient, useMutation } from "@tanstack/react-query";
import { extractApiFieldErrors } from "@pos/api-client";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { tablesService } from "@/features/tables/services/tables.service";
import { tableKeys } from "@/features/tables/query-keys";
import type { TableFormInput } from "@/features/tables/types";

export const useUpdateTable = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Omit<TableFormInput, "branchId">;
    }) => tablesService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tableKeys.list() });
      notifySuccess("Table updated");
    },
    onError: (err) => {
      if (!Object.keys(extractApiFieldErrors(err)).length)
        notifyError(err, "Failed to update table");
    },
  });
};
