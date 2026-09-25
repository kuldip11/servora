import { useQueryClient, useMutation } from "@tanstack/react-query";
import { menuKeys } from "@/features/menu/query-keys";
import {
  menuTemplatesService,
  type SaveTemplateInput,
} from "@/features/menu/services/menu-templates.service";
import { notifySuccess } from "@/shared/lib/notify";

export const useSaveTemplateFromCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      categoryId,
      input,
    }: {
      categoryId: string;
      input: SaveTemplateInput;
    }) => menuTemplatesService.saveFromCategory(categoryId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.templates() });
      notifySuccess("Template saved");
    },
  });
};
