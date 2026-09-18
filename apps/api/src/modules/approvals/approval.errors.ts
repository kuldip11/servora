import { ForbiddenError } from "@/core/errors";

export const managerApprovalRequired = (): ForbiddenError =>
  new ForbiddenError("Manager approval required", {
    reason: "MANAGER_APPROVAL_REQUIRED",
  });

export const managerApprovalInvalid = (): ForbiddenError =>
  new ForbiddenError(
    "Manager approval is invalid, expired, or already used",
    { reason: "MANAGER_APPROVAL_INVALID" },
  );
