import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notifyError } from "@/shared/lib/notify";
import { staffService } from "@/features/staff/services/staff.service";
import { staffKeys } from "@/features/staff/query-keys";

export const useUpdateStaffStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      staffService.updateStatus(id, status),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: staffKeys.list() }),
    onError: (err) => notifyError(err, "Failed to update staff status"),
  });
};
