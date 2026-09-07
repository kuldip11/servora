import { useEffect, useState } from "react";
import { Badge, Button, Card, Modal, Spinner } from "@pos/ui";
import { createOrdersApi } from "@pos/api-client";
import { apiClient, extractApiError } from "@/shared/lib/api-client";
import { formatCurrency } from "@/shared/utils/format";

const ordersApi = createOrdersApi(apiClient);

type ExplanationTrace = {
  stage: string;
  explanation: string;
};

type AvailabilitySnapshot = {
  effectiveStatus: string;
  reason?: string | null;
  cause: string;
  branchId: string;
  channel: string;
  fulfillmentType: string;
  asOf: string;
};

type PriceBreakdownEntry = {
  kind: string;
  label: string;
  amount: number;
  source: string;
};

type PricingReplay = {
  priceSource?: { kind: string; id: string; description: string } | null;
  baseResolvedUnitPrice: number;
  variantDelta: number;
  modifierDelta: number;
  comboDelta: number;
  promotionDelta: number;
  loyaltyDelta: number;
  persistedSubtotal: number;
  payableBeforeTax: number;
  matchesSnapshot: boolean;
};

type ExplanationLine = {
  orderItemId: string;
  name: string;
  asOf: string;
  historicalEvidenceComplete: boolean;
  availabilityAtOrder?: AvailabilitySnapshot | null;
  priceBreakdown: PriceBreakdownEntry[];
  pricingReplay: PricingReplay;
  authoritativePricingReplay?: {
    unitPrice: number;
    subtotal: number;
    taxRate: number;
    matchesSnapshot: boolean;
  } | null;
  authoritativeAvailabilityReplay?: {
    effectiveStatus: string;
    isHidden: boolean;
    availabilityReason: string | null;
    availabilityCause: string;
    matchesSnapshot: boolean;
  } | null;
  trace: ExplanationTrace[];
};

type TicketState = {
  ticketId: string;
  ticketNumber: number;
  status: string;
  stationNames: string[];
  itemNames: string[];
  firedAt: string | null;
  elapsedMinutes: number;
  targetMinutes: number | null;
  overdue: boolean;
};

type InventoryMovement = {
  deductionId: string;
  inventoryItemName: string;
  menuItemName: string;
  quantitySold: number | null;
  quantityDeducted: number;
  deductionPerUnit: number | null;
  unit: string;
  transactionType: string;
  wasShort: boolean;
  deductedAt: string;
  reversedAt: string | null;
};

type OrderExplanation = {
  orderId: string;
  asOf: string;
  completeHistory: boolean;
  historyNotice: string;
  orderState: {
    currentState: string;
    explanation: string;
    blockingTicket: TicketState | null;
    tickets: TicketState[];
  };
  inventoryMovements: InventoryMovement[];
  totals: {
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    serviceChargeAmount: number;
    roundingAdjustment: number;
    totalAmount: number;
  };
  lines: ExplanationLine[];
};

const signedCurrency = (amount: number) => {
  if (amount === 0) return formatCurrency(0);
  return `${amount > 0 ? "+" : "−"}${formatCurrency(Math.abs(amount))}`;
};

const humanize = (value: string) => value.replace(/_/g, " ");

export const OrderExplainDialog = ({
  open,
  orderId,
  onClose,
}: {
  open: boolean;
  orderId: string;
  onClose: () => void;
}) => {
  const [explanation, setExplanation] = useState<OrderExplanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    void ordersApi
      .explain<OrderExplanation>(orderId)
      .then((response) => {
        if (!cancelled) setExplanation(response);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(extractApiError(reason));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, orderId]);

  return (
    <Modal open={open} onClose={onClose} title="Why did this happen?" size="xl">
      {loading ? (
        <div className="flex min-h-40 items-center justify-center">
          <Spinner className="h-6 w-6" />
        </div>
      ) : error ? (
        <Card className="border-danger/30 bg-danger-surface">
          <p className="text-sm font-semibold text-danger">
            Unable to explain this order
          </p>
          <p className="mt-1 text-sm text-text-secondary">{error}</p>
        </Card>
      ) : explanation ? (
        <div className="space-y-5">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-text-primary">
                  Order explanation
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Servora reconstructed the pricing and availability decisions
                  captured when this order was fired.
                </p>
              </div>
              <Badge
                variant={explanation.completeHistory ? "success" : "warning"}
              >
                {explanation.completeHistory
                  ? "Replay verified"
                  : "Replay mismatch"}
              </Badge>
            </div>
            <p className="mt-3 text-xs text-text-secondary">
              {explanation.historyNotice}
            </p>
          </Card>

          <section aria-labelledby="order-state-explanation">
            <h2
              id="order-state-explanation"
              className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-secondary"
            >
              Why is the order in this state?
            </h2>
            <Card>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{humanize(explanation.orderState.currentState)}</Badge>
                {explanation.orderState.blockingTicket?.overdue && (
                  <Badge variant="warning">Past preparation target</Badge>
                )}
              </div>
              <p className="mt-3 text-sm font-medium text-text-primary">
                {explanation.orderState.explanation}
              </p>
              {explanation.orderState.blockingTicket && (
                <div className="mt-4 grid gap-3 rounded-lg bg-surface-secondary p-3 text-sm sm:grid-cols-4">
                  <div>
                    <span className="text-text-secondary">Blocking item</span>
                    <strong className="block text-text-primary">
                      {explanation.orderState.blockingTicket.itemNames.join(
                        ", ",
                      ) || "Kitchen ticket"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-text-secondary">Station</span>
                    <strong className="block text-text-primary">
                      {explanation.orderState.blockingTicket.stationNames.join(
                        ", ",
                      ) || "Unassigned"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-text-secondary">Elapsed</span>
                    <strong className="block text-text-primary">
                      {explanation.orderState.blockingTicket.elapsedMinutes}m
                    </strong>
                  </div>
                  <div>
                    <span className="text-text-secondary">Target</span>
                    <strong className="block text-text-primary">
                      {explanation.orderState.blockingTicket.targetMinutes ==
                      null
                        ? "Not configured"
                        : `${explanation.orderState.blockingTicket.targetMinutes}m`}
                    </strong>
                  </div>
                </div>
              )}
            </Card>
          </section>

          <section aria-labelledby="price-explanation">
            <h2
              id="price-explanation"
              className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-secondary"
            >
              Why this price?
            </h2>
            <div className="space-y-3">
              {explanation.lines.map((line) => (
                <Card key={line.orderItemId}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-text-primary">
                        {line.name}
                      </h3>
                      <p className="mt-1 text-xs text-text-secondary">
                        Decision captured {new Date(line.asOf).toLocaleString()}
                      </p>
                    </div>
                    <strong className="text-text-primary">
                      {formatCurrency(line.pricingReplay.payableBeforeTax)}
                    </strong>
                  </div>

                  <div className="mt-4 divide-y divide-divider rounded-lg border border-border">
                    {line.priceBreakdown.map((entry, index) => (
                      <div
                        key={`${entry.kind}:${index}`}
                        className="flex items-start justify-between gap-4 px-3 py-2.5 text-sm"
                      >
                        <div>
                          <p className="font-medium text-text-primary">
                            {entry.label}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {entry.source}
                          </p>
                        </div>
                        <span
                          className={
                            entry.amount < 0
                              ? "text-success"
                              : "text-text-primary"
                          }
                        >
                          {signedCurrency(entry.amount)}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-3 py-2.5 text-sm font-semibold">
                      <span className="text-text-primary">
                        Final before tax
                      </span>
                      <span className="text-text-primary">
                        {formatCurrency(line.pricingReplay.payableBeforeTax)}
                      </span>
                    </div>
                  </div>

                  {line.availabilityAtOrder && (
                    <div className="mt-4 rounded-lg bg-surface-secondary p-3 text-sm">
                      <p className="font-medium text-text-primary">
                        Why was this item orderable?
                      </p>
                      <p className="mt-1 text-text-secondary">
                        {humanize(line.availabilityAtOrder.effectiveStatus)} ·
                        Source: {humanize(line.availabilityAtOrder.cause)} ·{" "}
                        {line.availabilityAtOrder.channel}/
                        {line.availabilityAtOrder.fulfillmentType}
                      </p>
                      {line.availabilityAtOrder.reason && (
                        <p className="mt-1 text-text-secondary">
                          {line.availabilityAtOrder.reason}
                        </p>
                      )}
                    </div>
                  )}

                  <details className="mt-4 rounded-lg border border-border px-3 py-2 text-sm">
                    <summary className="cursor-pointer font-medium text-text-primary">
                      Technical decision trace
                    </summary>
                    <ol className="mt-3 space-y-2">
                      {line.trace.map((entry, index) => (
                        <li
                          key={`${entry.stage}:${index}`}
                          className="flex gap-3"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-surface text-xs font-semibold text-primary">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium text-text-primary">
                              {humanize(entry.stage)}
                            </p>
                            <p className="text-text-secondary">
                              {entry.explanation}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </details>
                </Card>
              ))}
            </div>
          </section>

          <section aria-labelledby="inventory-explanation">
            <h2
              id="inventory-explanation"
              className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-secondary"
            >
              Why did inventory move?
            </h2>
            <Card>
              {explanation.inventoryMovements.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  No recipe inventory deduction was recorded for this order.
                </p>
              ) : (
                <div className="space-y-3">
                  {explanation.inventoryMovements.map((movement) => (
                    <div
                      key={movement.deductionId}
                      className="rounded-lg border border-border p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-text-primary">
                            {movement.inventoryItemName} decreased by{" "}
                            {movement.quantityDeducted} {movement.unit}
                          </p>
                          <p className="mt-1 text-xs text-text-secondary">
                            Order item: {movement.menuItemName} · Transaction:{" "}
                            {humanize(movement.transactionType)}
                          </p>
                        </div>
                        {movement.wasShort && (
                          <Badge variant="warning">Insufficient stock</Badge>
                        )}
                      </div>
                      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                        <div>
                          <span className="text-text-secondary">
                            Quantity sold
                          </span>
                          <strong className="block text-text-primary">
                            {movement.quantitySold ?? "Unknown"}
                          </strong>
                        </div>
                        <div>
                          <span className="text-text-secondary">
                            Recipe deduction each
                          </span>
                          <strong className="block text-text-primary">
                            {movement.deductionPerUnit == null
                              ? "Unknown"
                              : `${movement.deductionPerUnit} ${movement.unit}`}
                          </strong>
                        </div>
                        <div>
                          <span className="text-text-secondary">Recorded</span>
                          <strong className="block text-text-primary">
                            {new Date(movement.deductedAt).toLocaleString()}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </section>

          <Card>
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <span className="text-text-secondary">Subtotal</span>
                <strong className="block text-text-primary">
                  {formatCurrency(explanation.totals.subtotal)}
                </strong>
              </div>
              <div>
                <span className="text-text-secondary">Discount</span>
                <strong className="block text-text-primary">
                  {formatCurrency(explanation.totals.discountAmount)}
                </strong>
              </div>
              <div>
                <span className="text-text-secondary">Order total</span>
                <strong className="block text-text-primary">
                  {formatCurrency(explanation.totals.totalAmount)}
                </strong>
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
};
