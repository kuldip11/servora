import { describe, expect, it } from "vitest";
import {
  branchNotFound,
  allOrderTypesDisabled,
  branchHasOpenDineInOrders,
  lastActiveBranch,
  branchHasOpenOrders,
  branchCodeAlreadyExists,
  tablesRequireDineIn,
} from "@/modules/branches/branch.errors";
describe("branch errors", () => {
  it("creates a stable not-found error with the branch id", () => {
    const error = branchNotFound("b1");
    expect(error.toJSON()).toMatchObject({ code: "NOT_FOUND" });
    expect(error.message).toBe("Branch with id b1 not found");
    expect(error.details).toMatchObject({
      resource: "Branch",
      resourceId: "b1",
    });
  });
  it("preserves branch conflict reasons and messages", () => {
    expect(allOrderTypesDisabled().details).toMatchObject({
      reason: "ALL_ORDER_TYPES_DISABLED",
    });
    expect(branchHasOpenDineInOrders().details).toMatchObject({
      reason: "BRANCH_HAS_OPEN_DINE_IN_ORDERS",
    });
    expect(lastActiveBranch().details).toMatchObject({ reason: "LAST_BRANCH" });
    expect(branchHasOpenOrders().details).toMatchObject({
      reason: "BRANCH_HAS_OPEN_ORDERS",
    });
    expect(branchCodeAlreadyExists("MAIN-01").details).toMatchObject({
      reason: "BRANCH_CODE_EXISTS",
      code: "MAIN-01",
    });
    expect(tablesRequireDineIn().details).toMatchObject({
      reason: "TABLES_REQUIRE_DINE_IN",
    });
    expect(lastActiveBranch().statusCode).toBe(409);
  });
});
