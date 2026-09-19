import { useMutation } from "@tanstack/react-query";
import { menuKeys } from "@/features/menu/query-keys";
import {
  menuTemplatesService,
  type ApplyTemplateInput,
} from "@/features/menu/services/menu-templates.service";
import { queryClient } from "@/shared/lib/query-client";

export const useApplyTemplate = () =>
  useMutation({
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
