import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { notifyError } from "@/shared/lib/notify";
import { menuKeys } from "@/features/menu/query-keys";
import { channelOverridesQuery } from "@/features/menu/query-options";
import { menuChannelOverridesService } from "@/features/menu/services/menu-channel-overrides.service";

export const useChannelOverrides = (itemId: string) =>
  useQuery(channelOverridesQuery(itemId));

export const useSaveChannelOverride = (itemId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      menuChannelOverridesService.save(itemId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: menuKeys.channelOverrides(itemId),
      }),
    onError: (error) => notifyError(error, "Failed to save channel override"),
  });
};

export const useDeleteChannelOverride = (itemId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: menuChannelOverridesService.remove,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: menuKeys.channelOverrides(itemId),
      }),
    onError: (error) => notifyError(error, "Failed to remove channel override"),
  });
};
