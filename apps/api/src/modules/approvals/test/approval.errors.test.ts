import { describe, expect, it } from "vitest";
import { serializeAppError } from "@/core/errors";
import {
  managerApprovalInvalid,
  managerApprovalRequired,
} from "../approval.errors";

describe("approval errors", () => {
  it.each([
    [managerApprovalRequired, "MANAGER_APPROVAL_REQUIRED"],
    [managerApprovalInvalid, "MANAGER_APPROVAL_INVALID"],
  ])("exposes a stable frontend code", (factory, code) => {
    const response = serializeAppError(factory(), "req-approval");
    expect(response.error.code).toBe(code);
    expect(response.error.retryable).toBe(false);
  });
});
