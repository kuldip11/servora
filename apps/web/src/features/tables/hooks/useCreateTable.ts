import { useMutation } from "@tanstack/react-query";
import { extractApiFieldErrors } from "@pos/api-client";
import { queryClient } from "@/shared/lib/query-client";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { tablesService } from "@/features/tables/services/tables.service";
import { tableKeys } from "@/features/tables/query-keys";
import type { TableFormInput } from "@/features/tables/types";

export const useCreateTable = () => {
  return useMutation({
    mutationFn: (input: TableFormInput) => tablesService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tableKeys.all });
      notifySuccess("Table added");
    },
    onError: (err) => {
      if (!Object.keys(extractApiFieldErrors(err)).length)
        notifyError(err, "Failed to add table");
    },
  });
};
