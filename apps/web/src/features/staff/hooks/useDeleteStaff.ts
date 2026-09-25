import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { staffService } from "@/features/staff/services/staff.service";
import { staffKeys } from "@/features/staff/query-keys";

export const useDeleteStaff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => staffService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.list() });
      notifySuccess("Staff member removed");
    },
    onError: (err) => notifyError(err, "Failed to remove staff"),
  });
};
