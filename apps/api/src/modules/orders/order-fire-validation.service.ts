import type { AuthContext } from "@/core/auth";
import { ValidationError } from "@/core/errors";
import { orderNotFound, orderNotOpen } from "./order.errors";
import {
  assertCourseSequencingAllowed,
  requestedCourseNumbers,
} from "./order-fire.helpers";
import type { FireTicketInput } from "./order-fire.types";
import { orderRepository } from "./order.repository";
import {
  assertOrderResourceAccess,
  requireOrdersPermission,
} from "./orders-authorization";

export async function validateOrderFire(
  auth: AuthContext,
  orderId: string,
  input: FireTicketInput,
) {
  requireOrdersPermission(auth, "orders:update");
  const order = await orderRepository.findById(auth.tenantId, orderId);
  if (!order) throw orderNotFound(orderId);
  assertOrderResourceAccess(auth, order.branchId);

  if (order.status !== "OPEN") throw orderNotOpen(order.status);

  const regularItems = input.items ?? [];
  await assertCourseSequencingAllowed(
    auth.tenantId,
    regularItems,
    input.combos ?? [],
  );
  const fireCourseNumbers = requestedCourseNumbers(
    regularItems,
    input.combos ?? [],
  );
  if (
    fireCourseNumbers.length > 0 &&
    fireCourseNumbers.length !==
      regularItems.length + (input.combos?.length ?? 0)
  ) {
    throw new ValidationError(
      "Every line must have a course when course sequencing is used",
    );
  }
  if (regularItems.length === 0 && !input.combos?.length) {
    throw new ValidationError("Order requires at least one item or combo");
  }

  return { order, regularItems };
}
