import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notifySuccess } from "@/shared/lib/notify";
import {
  staffService,
  type StaffFormInput,
} from "@/features/staff/services/staff.service";
import { staffKeys } from "@/features/staff/query-keys";

export const useAddStaff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StaffFormInput) => staffService.add(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.list() });
      notifySuccess("Staff member added");
    },
  });
};
