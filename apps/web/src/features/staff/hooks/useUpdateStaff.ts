import { useMutation, useQueryClient } from "@tanstack/react-query";
import { staffKeys } from "../query-keys";
import { staffService } from "../services/staff.service";

export type UpdateStaffInput = {
  id: string;
  input: {
    firstName: string;
    lastName: string;
    roleId: string;
    branchIds: string[];
  };
};

export const useUpdateStaff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: UpdateStaffInput) =>
      staffService.update(id, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: staffKeys.list() }),
  });
};
