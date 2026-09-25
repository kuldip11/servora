import { useQueryClient, useMutation } from "@tanstack/react-query";
import { menuKeys } from "@/features/menu/query-keys";
import {
  menuTemplatesService,
  type ApplyTemplateInput,
} from "@/features/menu/services/menu-templates.service";

export const useApplyTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      templateId,
      input,
    }: {
      templateId: string;
      input: ApplyTemplateInput;
    }) => menuTemplatesService.apply(templateId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
    },
  });
};
