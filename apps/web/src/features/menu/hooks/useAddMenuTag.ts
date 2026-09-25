import { useQueryClient, useMutation } from "@tanstack/react-query";
import { menuKeys } from "@/features/menu/query-keys";
import { menuTagsService } from "@/features/menu/services/menu-tags.service";
import { notifySuccess } from "@/shared/lib/notify";

export const useAddMenuTag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) =>
      menuTagsService.create(name, color),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.tags() });
      notifySuccess("Tag created");
    },
  });
};
