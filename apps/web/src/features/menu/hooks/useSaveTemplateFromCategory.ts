import { useMutation } from "@tanstack/react-query";
import { menuKeys } from "@/features/menu/query-keys";
import {
  menuTemplatesService,
  type SaveTemplateInput,
} from "@/features/menu/services/menu-templates.service";
import { notifySuccess } from "@/shared/lib/notify";
import { queryClient } from "@/shared/lib/query-client";

export const useSaveTemplateFromCategory = () =>
  useMutation({
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
