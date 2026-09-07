import type { AuthContext } from "@/core/auth";
import { requirePermission } from "@/core/auth";
import { InternalError, NotFoundError } from "@/core/errors";
import { orderRepository } from "@/modules/orders/order.repository";
import { assertOrderResourceAccess } from "@/modules/orders/orders-authorization";
import { inventoryService } from "@/modules/inventory/inventory.service";
import {
  pricingPipeline,
  type PricingReplayEvidence,
} from "@/modules/orders/pricing/pricing-pipeline";
import {
  availabilityService,
  type AvailabilityReplayEvidence,
} from "@/modules/menu/availability/availability.service";
import { menuChangeLog } from "@/modules/menu/change-log/menu-change-log";

const money = (value: number) => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

export const replayPersistedLine = (item: {
  quantity: number;
  unitPrice: string;
  subtotal: string;
  pricingAttribution: {
    BASE_PRICE: number;
    VARIANT: number;
    MODIFIER: number;
    COMBO?: number;
    PROMOTION?: number;
    LOYALTY?: number;
    PRICE_SOURCE?: { kind: string; id: string; description: string };
  } | null;
}) => {
  const attribution = item.pricingAttribution ?? {
    BASE_PRICE: Number(item.unitPrice),
    VARIANT: 0,
    MODIFIER: 0,
  };
  const persistedSubtotal = Number(item.subtotal);
  const comboDelta = attribution.COMBO ?? 0;
  const preComboSubtotal = money(persistedSubtotal - comboDelta);
  const replayedPreComboSubtotal = money(
    (attribution.BASE_PRICE + attribution.VARIANT + attribution.MODIFIER) *
      item.quantity,
  );
  const replayedSubtotal = money(replayedPreComboSubtotal + comboDelta);
  const promotion = attribution.PROMOTION ?? 0;
  const loyalty = attribution.LOYALTY ?? 0;
  const payableBeforeTax = money(
    Math.max(0, persistedSubtotal + promotion + loyalty),
  );
  return {
    priceSource: attribution.PRICE_SOURCE ?? null,
    baseResolvedUnitPrice: attribution.BASE_PRICE,
    variantDelta: attribution.VARIANT,
    modifierDelta: attribution.MODIFIER,
    comboDelta,
    promotionDelta: promotion,
    loyaltyDelta: loyalty,
    replayedPreComboSubtotal,
    preComboSubtotal,
    replayedSubtotal,
    persistedSubtotal: money(persistedSubtotal),
    payableBeforeTax,
    matchesSnapshot:
      replayedPreComboSubtotal === preComboSubtotal &&
      replayedSubtotal === money(persistedSubtotal),
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const isPricingReplayEvidence = (
  value: unknown,
): value is PricingReplayEvidence => {
  if (!isRecord(value)) return false;
  const line = value.requestedLine;
  const item = value.item;
  return (
    isRecord(line) &&
    typeof line.menuItemId === "string" &&
    typeof line.quantity === "number" &&
    isRecord(item) &&
    typeof item.id === "string" &&
    Array.isArray(value.priceRules)
  );
};

const isAvailabilityReplayEvidence = (
  value: unknown,
): value is AvailabilityReplayEvidence => {
  if (!isRecord(value)) return false;
  const item = value.item;
  const resolvedStatus = value.resolvedStatus;
  return (
    isRecord(item) &&
    typeof item.id === "string" &&
    isRecord(resolvedStatus) &&
    typeof resolvedStatus.status === "string" &&
    typeof resolvedStatus.reason === "string"
  );
};

export const orderExplainService = {
  async explainOrder(auth: AuthContext, orderId: string) {
    requirePermission(auth, "orders:read");
    const order = await orderRepository.findById(auth.tenantId, orderId);
    if (!order) throw new NotFoundError("Order", orderId);
    assertOrderResourceAccess(auth, order.branchId);

    const inventoryDeductions =
      await inventoryService.getOrderDeductions(orderId);
    const now = new Date();
    const activeTicketStatuses = new Set(["HELD", "FIRED", "PREPARING"]);
    const ticketStates = (order.kitchenTickets ?? []).map((ticket) => {
      const firedAt = ticket.firedAt ?? ticket.createdAt;
      const endAt = ticket.readyAt ?? now;
      const elapsedMinutes = firedAt
        ? Math.max(0, Math.floor((endAt.getTime() - firedAt.getTime()) / 60000))
        : 0;
      const targets = ticket.items
        .map((ticketItem) => {
          const evidence = isAvailabilityReplayEvidence(
            ticketItem.availabilityReplayEvidence,
          )
            ? ticketItem.availabilityReplayEvidence
            : null;
          return evidence?.item.prepTimeMinutes ?? null;
        })
        .filter((value): value is number => value != null);
      const targetMinutes = targets.length ? Math.max(...targets) : null;
      const stationNames = [
        ...new Set(
          ticket.items
            .map((ticketItem) => ticketItem.station?.name)
            .filter((value): value is string => Boolean(value)),
        ),
      ];
      return {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        stationNames,
        itemNames: ticket.items.map((ticketItem) => ticketItem.menuItemName),
        firedAt: firedAt?.toISOString() ?? null,
        elapsedMinutes,
        targetMinutes,
        overdue:
          targetMinutes != null &&
          activeTicketStatuses.has(ticket.status) &&
          elapsedMinutes > targetMinutes,
      };
    });
    const blockingTickets = ticketStates.filter((ticket) =>
      activeTicketStatuses.has(ticket.status),
    );
    const primaryBlocker =
      blockingTickets
        .slice()
        .sort((left, right) => right.elapsedMinutes - left.elapsedMinutes)[0] ??
      null;

    const orderState = {
      currentState: order.status,
      explanation:
        primaryBlocker != null
          ? `Waiting on kitchen ticket #${primaryBlocker.ticketNumber}${primaryBlocker.itemNames[0] ? ` (${primaryBlocker.itemNames[0]})` : ""}.`
          : order.status === "OPEN" && ticketStates.length === 0
            ? "The order is open and has no kitchen tickets yet."
            : order.status === "OPEN"
              ? "All fired kitchen tickets are ready or served; the order remains open for additional rounds or billing."
              : `No active kitchen blocker was found for the current ${order.status} state.`,
      blockingTicket: primaryBlocker,
      tickets: ticketStates,
    };

    const inventoryMovements = inventoryDeductions.map((deduction) => {
      const orderItem = order.items.find(
        (item) => item.id === deduction.orderItemId,
      );
      const soldQuantity = orderItem?.quantity ?? null;
      const totalDeducted = Number(deduction.quantityDeducted);
      return {
        deductionId: deduction.id,
        inventoryItemId: deduction.inventoryItemId,
        inventoryItemName: deduction.inventoryItem.name,
        menuItemId: deduction.menuItemId,
        menuItemName: deduction.menuItem.name,
        orderItemId: deduction.orderItemId,
        quantitySold: soldQuantity,
        quantityDeducted: totalDeducted,
        deductionPerUnit:
          soldQuantity && soldQuantity > 0
            ? money(totalDeducted / soldQuantity)
            : null,
        unit: deduction.unit,
        transactionType: deduction.reversedAt
          ? "RECIPE_CONSUMPTION_REVERSED"
          : "RECIPE_CONSUMPTION",
        wasShort: deduction.wasShort,
        deductedAt: deduction.deductedAt.toISOString(),
        reversedAt: deduction.reversedAt?.toISOString() ?? null,
      };
    });

    const orderAsOf = order.resolutionAsOf ?? order.createdAt;
    const lines = [];

    for (const item of order.items) {
      if (!item.resolutionAsOf) {
        throw new InternalError("Order replay evidence is incomplete");
      }
      const lineAsOf = item.resolutionAsOf;
      const persistedReplay = replayPersistedLine(item);

      if (!item.menuItemId) {
        lines.push({
          orderItemId: item.id,
          name: item.menuItemName,
          asOf: lineAsOf.toISOString(),
          historicalEvidenceComplete: true,
          snapshotPrice: Number(item.unitPrice),
          priceBreakdown: [
            {
              kind: "BASE_PRICE",
              label: "Grouping price",
              amount: money(
                persistedReplay.baseResolvedUnitPrice * item.quantity,
              ),
              source:
                persistedReplay.priceSource?.description ??
                "Stored grouping price",
            },
            ...(persistedReplay.comboDelta
              ? [
                  {
                    kind: "COMBO",
                    label: "Combo adjustment",
                    amount: persistedReplay.comboDelta,
                    source: "Combo pricing policy",
                  },
                ]
              : []),
          ],
          pricingReplay: persistedReplay,
          trace: [
            {
              stage: "CONTEXT",
              explanation: `Grouping line resolved at ${lineAsOf.toISOString()}.`,
            },
            {
              stage: "PRICING_PIPELINE",
              explanation:
                "Combo/cover grouping value is preserved on the immutable order line.",
              attribution: item.pricingAttribution ?? {},
            },
            {
              stage: "SNAPSHOT",
              explanation:
                "Grouping lines do not have an availability resolver result because they are not menu items.",
            },
          ],
        });
        continue;
      }

      const changes = await menuChangeLog.list(auth.tenantId, {
        entityId: item.menuItemId,
        before: new Date(lineAsOf.getTime() + 1),
        limit: 20,
      });
      const availability = item.availabilitySnapshot ?? null;
      const pricingEvidence = isPricingReplayEvidence(
        item.pricingReplayEvidence,
      )
        ? item.pricingReplayEvidence
        : null;
      const availabilityEvidence = isAvailabilityReplayEvidence(
        item.availabilityReplayEvidence,
      )
        ? item.availabilityReplayEvidence
        : null;

      if (!availability || !pricingEvidence || !availabilityEvidence) {
        throw new InternalError("Order replay evidence is incomplete");
      }

      let authoritativePricingReplay: {
        unitPrice: number;
        subtotal: number;
        taxRate: number;
        matchesSnapshot: boolean;
      } | null = null;
      let authoritativeAvailabilityReplay: {
        effectiveStatus: string;
        isHidden: boolean;
        availabilityReason: string | null;
        availabilityCause: string;
        matchesSnapshot: boolean;
      } | null = null;

      {
        const replayedAvailability = await availabilityService.getEffectiveItem(
          auth.tenantId,
          item.menuItemId,
          availability.branchId,
          {
            channel: availability.channel,
            fulfillmentType:
              availability.fulfillmentType === "UNSCOPED"
                ? order.type
                : availability.fulfillmentType,
            asOf: lineAsOf,
            historicalReplay: availabilityEvidence,
          },
        );
        authoritativeAvailabilityReplay = {
          effectiveStatus: replayedAvailability.effectiveStatus,
          isHidden: replayedAvailability.isHidden,
          availabilityReason: replayedAvailability.availabilityReason ?? null,
          availabilityCause: replayedAvailability.availabilityCause,
          matchesSnapshot:
            replayedAvailability.effectiveStatus ===
              availability.effectiveStatus &&
            replayedAvailability.isHidden === availability.isHidden &&
            (replayedAvailability.availabilityReason ?? null) ===
              availability.reason &&
            replayedAvailability.availabilityCause === availability.cause,
        };

        const replayedPricing = await pricingPipeline.price(
          {
            tenantId: auth.tenantId,
            branchId: availability.branchId,
            channel: availability.channel,
            fulfillmentType:
              availability.fulfillmentType === "UNSCOPED"
                ? order.type
                : availability.fulfillmentType,
            ...(order.customerId ? { customerId: order.customerId } : {}),
            ...(order.customerGroupId
              ? { customerGroupId: order.customerGroupId }
              : {}),
            asOf: lineAsOf,
            allowUnavailable: true,
            historicalReplay: pricingEvidence,
          },
          [pricingEvidence.requestedLine],
        );
        const replayedLine = replayedPricing.lines[0];
        if (!replayedLine) {
          throw new InternalError("Order pricing replay produced no line");
        }
        const expectedBaseSubtotal = money(
          Number(item.subtotal) - (item.pricingAttribution?.COMBO ?? 0),
        );
        const expectedBaseUnitPrice = money(
          expectedBaseSubtotal / item.quantity,
        );
        authoritativePricingReplay = {
          unitPrice: money(replayedLine.unitPrice),
          subtotal: money(replayedLine.subtotal),
          taxRate: money(replayedLine.taxRate),
          matchesSnapshot:
            money(replayedLine.unitPrice) === expectedBaseUnitPrice &&
            money(replayedLine.subtotal) === expectedBaseSubtotal &&
            money(replayedLine.taxRate) === money(Number(item.taxRate)),
        };
      }

      const historicalEvidenceComplete = Boolean(
        authoritativePricingReplay?.matchesSnapshot &&
        authoritativeAvailabilityReplay?.matchesSnapshot,
      );

      lines.push({
        orderItemId: item.id,
        menuItemId: item.menuItemId,
        name: item.menuItemName,
        asOf: lineAsOf.toISOString(),
        historicalEvidenceComplete,
        snapshotPrice: Number(item.unitPrice),
        snapshotTaxRate: Number(item.taxRate),
        pricingAttribution: item.pricingAttribution ?? {},
        priceBreakdown: [
          {
            kind: "BASE_PRICE",
            label:
              persistedReplay.priceSource?.kind === "BRANCH_OVERRIDE"
                ? "Branch-resolved base price"
                : persistedReplay.priceSource?.kind === "PRICE_RULE"
                  ? "Rule-resolved base price"
                  : "Base price",
            amount: money(
              persistedReplay.baseResolvedUnitPrice * item.quantity,
            ),
            source:
              persistedReplay.priceSource?.description ??
              "Menu item base price",
          },
          ...(persistedReplay.variantDelta
            ? [
                {
                  kind: "VARIANT",
                  label: "Variant adjustment",
                  amount: money(persistedReplay.variantDelta * item.quantity),
                  source: item.variantName
                    ? `Variant: ${item.variantName}`
                    : "Selected variant",
                },
              ]
            : []),
          ...(persistedReplay.modifierDelta
            ? [
                {
                  kind: "MODIFIER",
                  label: "Modifier adjustment",
                  amount: money(persistedReplay.modifierDelta * item.quantity),
                  source:
                    item.modifiers.length > 0
                      ? item.modifiers
                          .map((modifier) => modifier.name)
                          .join(", ")
                      : "Selected modifiers",
                },
              ]
            : []),
          ...(persistedReplay.comboDelta
            ? [
                {
                  kind: "COMBO",
                  label: "Combo adjustment",
                  amount: persistedReplay.comboDelta,
                  source: "Combo pricing policy",
                },
              ]
            : []),
          ...(persistedReplay.promotionDelta
            ? [
                {
                  kind: "PROMOTION",
                  label: "Promotion",
                  amount: persistedReplay.promotionDelta,
                  source:
                    item.pricingAttribution?.PROMOTION_DETAILS?.map(
                      (promotion) => promotion.name,
                    ).join(", ") || "Promotion discount",
                },
              ]
            : []),
          ...(persistedReplay.loyaltyDelta
            ? [
                {
                  kind: "LOYALTY",
                  label: "Loyalty discount",
                  amount: persistedReplay.loyaltyDelta,
                  source:
                    item.pricingAttribution?.LOYALTY_DETAILS?.name ??
                    "Loyalty tier",
                },
              ]
            : []),
        ],
        pricingReplay: persistedReplay,
        authoritativePricingReplay,
        availabilityAtOrder: availability,
        authoritativeAvailabilityReplay,
        trace: [
          {
            stage: "CONTEXT",
            explanation: `Resolved for ${availability.channel}/${availability.fulfillmentType} at ${availability.asOf} in branch ${availability.branchId}.`,
          },
          {
            stage: "AVAILABILITY_RESOLVER_REPLAY",
            explanation: authoritativeAvailabilityReplay.matchesSnapshot
              ? "AvailabilityResolver re-ran against immutable fire-time inputs and exactly matched the stored availability snapshot."
              : "AvailabilityResolver replay differed from the stored availability snapshot.",
            replay: authoritativeAvailabilityReplay,
          },
          {
            stage: "PRICING_PIPELINE_STAGE_1",
            explanation:
              persistedReplay.priceSource?.description ??
              "Menu-item base price attribution",
            source: persistedReplay.priceSource,
          },
          {
            stage: "PRICING_PIPELINE_REPLAY",
            explanation: authoritativePricingReplay.matchesSnapshot
              ? "PricingPipeline re-ran against immutable fire-time inputs and exactly matched the stored base line price/tax snapshot."
              : "PricingPipeline replay differed from the stored base line snapshot.",
            replay: authoritativePricingReplay,
          },
          ...changes.map((event) => ({
            stage: "CHANGE_EVENT",
            explanation: `${event.entityType} ${event.changeType} at ${event.changedAt.toISOString()}`,
            eventId: event.id,
            diff: event.diff,
          })),
          {
            stage: "SNAPSHOT",
            explanation: `Charged line snapshot ${Number(item.unitPrice).toFixed(2)} with ${Number(item.taxRate).toFixed(2)}% tax. Later menu edits cannot change these values or the captured resolver inputs.`,
          },
        ],
      });
    }

    return {
      orderId,
      asOf: orderAsOf.toISOString(),
      completeHistory: lines.every((line) => line.historicalEvidenceComplete),
      historyNotice: lines.every((line) => line.historicalEvidenceComplete)
        ? "Deterministic AvailabilityResolver and PricingPipeline replay matched every fire-time snapshot."
        : "Replay evidence is present for every line, but one or more resolver results differ from the stored fire-time snapshot.",
      orderState,
      inventoryMovements,
      totals: {
        subtotal: Number(order.subtotal),
        discountAmount: Number(order.discountAmount),
        taxAmount: Number(order.taxAmount),
        serviceChargeAmount: Number(order.serviceChargeAmount),
        roundingAdjustment: Number(order.roundingAdjustment),
        totalAmount: Number(order.totalAmount),
      },
      lines,
    };
  },
};
