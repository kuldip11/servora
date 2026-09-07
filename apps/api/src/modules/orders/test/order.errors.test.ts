import { describe, expect, it } from "vitest";
import * as errors from "@/modules/orders/order.errors";

describe("order errors", () => {
  it("creates stable not-found and missing-branch errors", () => {
    expect(errors.orderNotFound("o1").toJSON()).toMatchObject({
      code: "NOT_FOUND",
    });
    expect(errors.orderBranchNotFound().toJSON()).toMatchObject({
      code: "NOT_FOUND",
    });
    expect(errors.branchRequiredForOrder().toJSON()).toMatchObject({
      code: "MISSING_BRANCH",
    });
    expect(errors.orderTableNotFound().toJSON()).toMatchObject({
      code: "NOT_FOUND",
    });
  });
  it("preserves business reasons for conflicts and validation", () => {
    expect(errors.orderTypeDisabled().details).toMatchObject({
      reason: "ORDER_TYPE_DISABLED",
    });
    expect(errors.tableRequiredForDineIn().details).toMatchObject({
      reason: "TABLE_REQUIRED",
    });
    expect(errors.tableOccupied().details).toMatchObject({
      reason: "TABLE_OCCUPIED",
    });
    expect(errors.ticketsNotServed().details).toMatchObject({
      reason: "TICKETS_NOT_SERVED",
    });
    expect(errors.orderNotOpen("PAID").details).toMatchObject({
      reason: "ORDER_INVALID_STATE",
      currentStatus: "PAID",
    });
  });
});

it("creates item and table-operation errors", () => {
  expect(errors.orderNotFound().toJSON()).toMatchObject({ code: "NOT_FOUND" });
  expect(errors.orderItemNotFound("i1").toJSON()).toMatchObject({ code: "NOT_FOUND" });
  expect(errors.orderItemCannotBeVoided("void").details).toMatchObject({ reason: "ORDER_ITEM_NOT_VOIDABLE" });
  expect(errors.orderItemCannotBeComped("comp").details).toMatchObject({ reason: "ORDER_ITEM_NOT_COMPABLE" });
  expect(errors.orderItemCannotBeRefired("refire").details).toMatchObject({ reason: "ORDER_ITEM_NOT_REFIREABLE" });
  expect(errors.orderCannotTransferTable("transfer").details).toMatchObject({ reason: "ORDER_TABLE_TRANSFER_FAILED" });
  expect(errors.orderCannotMerge("merge").details).toMatchObject({ reason: "ORDER_MERGE_FAILED" });
});
