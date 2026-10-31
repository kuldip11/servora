import type { AuthContext } from "@/core/auth";
import { ForbiddenError } from "@/core/errors";

export const requireBillingPermission = (
  auth: AuthContext,
  permission: string,
): void => {
  if (!auth.permissions.includes(permission)) {
    throw new ForbiddenError("Insufficient permissions", {
      required: permission,
    });
  }
};

type BillingScope = {
  branchId: string | null;
  tenantWide?: boolean | undefined;
};

export const requireBillingWriteContext = (auth: BillingScope): void => {
  if (!auth.tenantWide && !auth.branchId) {
    throw new ForbiddenError("Billing branch access denied");
  }
};

export const assertBillingResourceAccess = (
  auth: BillingScope,
  resourceBranchId: string,
): void => {
  if (auth.tenantWide) {
    if (auth.branchId && auth.branchId !== resourceBranchId) {
      throw new ForbiddenError("Billing branch access denied");
    }
    return;
  }

  if (!auth.branchId || auth.branchId !== resourceBranchId) {
    throw new ForbiddenError("Billing branch access denied");
  }
};
