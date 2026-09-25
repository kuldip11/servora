import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { menuCombosQuery } from "@/features/menu/query-options";
import { menuKeys } from "@/features/menu/query-keys";
import { menuCombosService } from "@/features/menu/services/menu-combos.service";

export const useCombos = () => useQuery(menuCombosQuery());

export const useSaveCombo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id?: string;
      input: Record<string, unknown>;
    }) =>
      id
        ? menuCombosService.update(id, input)
        : menuCombosService.create(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: menuKeys.combos() }),
  });
};

export const useDeleteCombo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: menuCombosService.remove,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: menuKeys.combos() }),
  });
};
