import type { AuthContext } from "@/core/auth";
import { DomainRuleError, ValidationError } from "@/core/errors";
import { ticketRepository } from "@/modules/kitchen-tickets/ticket.repository";
import { singleCourseNumber } from "./order-fire.helpers";
import { prepareOrderFirePricing } from "./order-fire-pricing.service";
import type { FireTicketInput } from "./order-fire.types";
import { orderRepository } from "./order.repository";

type FireOrder = NonNullable<
  Awaited<ReturnType<typeof orderRepository.findById>>
>;
type FirePricing = Awaited<ReturnType<typeof prepareOrderFirePricing>>;

export async function persistFiredTicket(
  auth: AuthContext,
  orderId: string,
  input: FireTicketInput,
  order: FireOrder,
  regularItems: NonNullable<FireTicketInput["items"]>,
  pricing: FirePricing,
) {
  const { newStage4Lines, repriced, snapshottedNewLines } = pricing;
  const courseNumber = singleCourseNumber(regularItems, input.combos ?? []);
  if (courseNumber !== undefined && courseNumber > 1) {
    const hasPriorCourse = await ticketRepository.hasCourseNumber(
      auth.tenantId,
      orderId,
      courseNumber - 1,
    );
    if (!hasPriorCourse) {
      throw new ValidationError(
        `Course ${courseNumber - 1} must exist before Course ${courseNumber} can be added`,
      );
    }
  }
  const courseStatus =
    courseNumber !== undefined &&
    (await ticketRepository.shouldHoldCourse(
      auth.tenantId,
      orderId,
      courseNumber,
    ))
      ? ("HELD" as const)
      : ("FIRED" as const);

  let ticket;
  try {
    ticket = await orderRepository.fireNewTicket(
      auth.tenantId,
      order.branchId,
      orderId,
      snapshottedNewLines,
      newStage4Lines.reduce((sum, line) => sum + line.subtotal, 0),
      0,
      input.notes,
      null,
      {
        existingPricingUpdates: repriced.existingPricingUpdates,
        absoluteTotals: {
          subtotal: repriced.subtotal,
          taxAmount: repriced.taxAmount,
          discountAmount: repriced.discountAmount,
          serviceChargeAmount: repriced.serviceChargeAmount,
          roundingAdjustment: repriced.roundingAdjustment,
          totalAmount: repriced.totalAmount,
        },
        promotionRedemptions: repriced.redemptions,
        replacePromotionRedemptions: true,
      },
      courseNumber === undefined
        ? undefined
        : { number: courseNumber, status: courseStatus },
    );
  } catch (error) {
    if (
      error instanceof DomainRuleError &&
      error.details?.reason === "MANUAL_STOCK_DEPLETED"
    ) {
      throw new ValidationError(
        "One or more count-tracked items sold out while this round was being confirmed",
      );
    }
    throw error;
  }

  return ticket;
}
