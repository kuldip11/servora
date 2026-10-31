import type { OrderType } from "@pos/types";
import type { AuthContext } from "@/core/auth";
import { ValidationError } from "@/core/errors";
import { branchRepository } from "@/modules/branches/branch.repository";
import { customerGroupRepository } from "@/modules/customer-groups/customer-group.repository";
import { tableRepository } from "@/modules/tables/table.repository";
import {
  branchRequiredForOrder,
  orderBranchNotFound,
  orderTableNotFound,
  orderTypeDisabled,
  tableOccupied,
  tableRequiredForDineIn,
} from "./order.errors";
import {
  assertCourseSequencingAllowed,
  assertInitialCourseSequence,
} from "./order-fire.helpers";
import { requireOrdersPermission } from "./orders-authorization";
import type { CreateOrderInput } from "./create-order.types";

const ORDER_TYPE_CAPABILITY_FIELD: Record<
  OrderType,
  "dineInEnabled" | "takeawayEnabled" | "deliveryEnabled" | "onlineEnabled"
> = {
  DINE_IN: "dineInEnabled",
  TAKEAWAY: "takeawayEnabled",
  DELIVERY: "deliveryEnabled",
  ONLINE: "onlineEnabled",
};

export async function validateCreateOrder(
  auth: AuthContext,
  input: CreateOrderInput,
) {
  requireOrdersPermission(auth, "orders:create");
  const branchId = auth.branchId;
  if (!branchId) throw branchRequiredForOrder();

  const branch = await branchRepository.findById(auth.tenantId, branchId);
  if (!branch) throw orderBranchNotFound();

  const capabilityField = ORDER_TYPE_CAPABILITY_FIELD[input.type];
  if (!capabilityField || !branch[capabilityField]) {
    throw orderTypeDisabled();
  }

  if (input.type === "DINE_IN" && !input.tableId) {
    throw tableRequiredForDineIn();
  }

  if (input.type === "DINE_IN" && input.tableId) {
    const table = await tableRepository.findById(auth.tenantId, input.tableId);
    if (!table || table.branchId !== branchId) {
      throw orderTableNotFound();
    }
    const alreadyOccupied = await tableRepository.hasOpenOrders(
      auth.tenantId,
      input.tableId,
    );
    if (alreadyOccupied) {
      throw tableOccupied();
    }
  }

  if (input.customerGroupId) {
    const customerGroup = await customerGroupRepository.findById(
      auth.tenantId,
      input.customerGroupId,
    );
    if (!customerGroup)
      throw new ValidationError(
        "Customer group does not belong to this tenant",
      );
  }

  const billingMode = input.billingMode ?? "LINE_ITEMS";
  if (billingMode === "PER_COVER") {
    if (
      !input.coverCount ||
      !Number.isInteger(input.coverCount) ||
      input.coverCount < 1
    ) {
      throw new ValidationError(
        "PER_COVER orders require a positive coverCount",
      );
    }
    if (!input.perCoverPriceRuleId) {
      throw new ValidationError("PER_COVER orders require perCoverPriceRuleId");
    }
  } else if (
    input.coverCount !== undefined ||
    input.perCoverPriceRuleId !== undefined
  ) {
    throw new ValidationError(
      "Cover pricing fields are only valid for PER_COVER orders",
    );
  }

  const regularItems = input.items ?? [];
  await assertCourseSequencingAllowed(
    auth.tenantId,
    regularItems,
    input.combos ?? [],
  );
  assertInitialCourseSequence(regularItems, input.combos ?? []);
  if (regularItems.length === 0 && !input.combos?.length)
    throw new ValidationError("Order requires at least one item or combo");

  return { branchId, billingMode };
}
