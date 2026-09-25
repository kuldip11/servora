import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { notifyError } from "@/shared/lib/notify";
import { takeawayQrQuery } from "@/features/tables/query-options";

export const useTakeawayQr = (
  branchId: string | null | undefined,
  options?: { enabled?: boolean },
) => {
  const validBranchId = branchId && branchId !== "all" ? branchId : "";
  const query = useQuery({
    ...takeawayQrQuery(validBranchId),
    enabled:
      Boolean(validBranchId) &&
      (options?.enabled === undefined ? true : options.enabled),
  });

  useEffect(() => {
    if (query.error) notifyError(query.error, "Unable to load takeaway QR");
  }, [query.error]);

  return query;
};
