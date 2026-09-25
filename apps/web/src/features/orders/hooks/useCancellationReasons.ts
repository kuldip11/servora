import { useQuery } from "@tanstack/react-query";
import { cancellationReasonsService } from "@/features/orders/services/cancellation-reasons.service";
import { franchiseQueryContextKey } from "@/shared/lib/query-context";

export const cancellationReasonKeys = {
  all: () => ["cancellation-reasons", ...franchiseQueryContextKey()] as const,
  active: () => [...cancellationReasonKeys.all(), "active"] as const,
};

export const useCancellationReasons = (activeOnly = true, enabled = true) => {
  return useQuery({
    queryKey: activeOnly
      ? cancellationReasonKeys.active()
      : cancellationReasonKeys.all(),
    enabled,
    queryFn: ({ signal }) =>
      activeOnly
        ? cancellationReasonsService.list(true, signal)
        : cancellationReasonsService.listAll(signal),
  });
};
