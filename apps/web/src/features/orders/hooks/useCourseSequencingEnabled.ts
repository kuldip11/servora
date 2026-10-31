import { activeFranchiseId } from "@/shared/lib/query-context";
import { useTenantSettings } from "@/features/settings";

export const useCourseSequencingEnabled = (): boolean => {
  const tenantId = activeFranchiseId();
  const { data } = useTenantSettings(tenantId ?? "", Boolean(tenantId));
  return data?.courseSequencingEnabled === true;
};
