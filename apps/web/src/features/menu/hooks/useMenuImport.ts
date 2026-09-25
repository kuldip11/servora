import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { menuImportService } from "@/features/menu/services/menu-import.service";
import { menuKeys } from "@/features/menu/query-keys";

export const useValidateMenuImport = () => {
  return useMutation({
    mutationFn: (file: File) => menuImportService.validate(file),
    onError: (err) => notifyError(err, "Failed to read file"),
  });
};

export const useCommitMenuImport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => menuImportService.commit(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
      notifySuccess(`Imported: ${data.inserted} new, ${data.updated} updated`);
    },
    onError: (err) => notifyError(err, "Import failed"),
  });
};
