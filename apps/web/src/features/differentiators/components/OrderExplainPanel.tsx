import { useState } from "react";
import { Badge, Button, Card, toast } from "@pos/ui";
import { DIFFERENTIATORS_INPUT_CLASS } from "@/features/differentiators/constants";
import { extractApiError } from "@/shared/lib/api-client";
import { useExplainDifferentiatorOrder } from "@/features/differentiators/hooks/useDifferentiators";
import { formatCurrency } from "@/shared/utils/format";

const Adjustment = ({ label, value }: { label: string; value: number }) => {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-text-secondary">{label}</span>
      <strong className="text-text-primary">
        {value > 0 ? "+" : ""}
        {formatCurrency(value)}
      </strong>
    </div>
  );
};

export const OrderExplainPanel = () => {
  const [orderId, setOrderId] = useState("");
  const explainMutation = useExplainDifferentiatorOrder();

  const explanation = explainMutation.data;

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="font-semibold">Explain an order</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Replays pricing and availability from immutable fire-time evidence so
          operators can see why Servora accepted, priced and persisted every
          line.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            className={`min-w-0 flex-1 ${DIFFERENTIATORS_INPUT_CLASS}`}
            value={orderId}
            onChange={(event) => setOrderId(event.target.value)}
            placeholder="Order UUID"
          />
          <Button
            loading={explainMutation.isPending}
            disabled={!orderId.trim()}
            onClick={() =>
              explainMutation.mutate(orderId.trim(), {
                onError: (error) =>
                  toast({ title: extractApiError(error), tone: "danger" }),
              })
            }
          >
            Explain
          </Button>
        </div>
      </Card>

      {explanation ? (
        <>
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-text-primary">
                  Deterministic replay
                </h3>
                <p className="mt-1 text-sm text-text-secondary">
                  {explanation.historyNotice}
                </p>
                <p className="mt-1 text-xs text-text-disabled">
                  Resolution time {new Date(explanation.asOf).toLocaleString()}
                </p>
              </div>
              <Badge
                variant={explanation.completeHistory ? "success" : "warning"}
              >
                {explanation.completeHistory ? "Verified" : "Mismatch detected"}
              </Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <span className="text-sm text-text-secondary">Subtotal</span>
                <strong className="block text-text-primary">
                  {formatCurrency(explanation.totals.subtotal)}
                </strong>
              </div>
              <div>
                <span className="text-sm text-text-secondary">
                  Tax + service
                </span>
                <strong className="block text-text-primary">
                  {formatCurrency(
                    explanation.totals.taxAmount +
                      explanation.totals.serviceChargeAmount,
                  )}
                </strong>
              </div>
              <div>
                <span className="text-sm text-text-secondary">Final total</span>
                <strong className="block text-text-primary">
                  {formatCurrency(explanation.totals.totalAmount)}
                </strong>
              </div>
            </div>
          </Card>

          {explanation.lines.map((line) => (
            <Card key={line.orderItemId}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-text-primary">
                    {line.name}
                  </h3>
                  <p className="mt-1 text-xs text-text-secondary">
                    Winning source:{" "}
                    {line.pricingReplay.priceSource?.description ??
                      "Menu-item base price"}
                  </p>
                </div>
                <Badge
                  variant={
                    line.historicalEvidenceComplete ? "success" : "warning"
                  }
                >
                  {line.historicalEvidenceComplete
                    ? "Replay verified"
                    : "Replay mismatch"}
                </Badge>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg bg-surface-secondary p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-disabled">
                    Why this price
                  </p>
                  <div className="mt-3 space-y-2">
                    <Adjustment
                      label="Resolved base"
                      value={line.pricingReplay.baseResolvedUnitPrice}
                    />
                    <Adjustment
                      label="Variant"
                      value={line.pricingReplay.variantDelta}
                    />
                    <Adjustment
                      label="Modifiers"
                      value={line.pricingReplay.modifierDelta}
                    />
                    <Adjustment
                      label="Combo"
                      value={line.pricingReplay.comboDelta}
                    />
                    <Adjustment
                      label="Promotion"
                      value={line.pricingReplay.promotionDelta}
                    />
                    <Adjustment
                      label="Loyalty"
                      value={line.pricingReplay.loyaltyDelta}
                    />
                    <div className="border-t border-divider pt-2 flex justify-between gap-3 text-sm">
                      <span className="text-text-secondary">
                        Stored subtotal
                      </span>
                      <strong>
                        {formatCurrency(line.pricingReplay.persistedSubtotal)}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-surface-secondary p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-disabled">
                    Why it was available
                  </p>
                  {line.availabilityAtOrder ? (
                    <div className="mt-3 space-y-1 text-sm">
                      <p className="font-medium text-text-primary">
                        {line.availabilityAtOrder.effectiveStatus.replace(
                          /_/g,
                          " ",
                        )}
                      </p>
                      <p className="text-text-secondary">
                        Cause:{" "}
                        {line.availabilityAtOrder.cause.replace(/_/g, " ")}
                      </p>
                      <p className="text-text-secondary">
                        {line.availabilityAtOrder.channel} ·{" "}
                        {line.availabilityAtOrder.fulfillmentType}
                      </p>
                      {line.availabilityAtOrder.reason ? (
                        <p className="pt-1 text-text-secondary">
                          {line.availabilityAtOrder.reason}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-text-secondary">
                      Grouping lines do not require menu availability.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge
                  variant={
                    line.pricingReplay.matchesSnapshot &&
                    line.authoritativePricingReplay?.matchesSnapshot
                      ? "success"
                      : "warning"
                  }
                >
                  Pricing replay{" "}
                  {line.authoritativePricingReplay?.matchesSnapshot
                    ? "matched"
                    : "needs review"}
                </Badge>
                <Badge
                  variant={
                    line.authoritativeAvailabilityReplay?.matchesSnapshot !==
                    false
                      ? "success"
                      : "warning"
                  }
                >
                  Availability replay{" "}
                  {line.authoritativeAvailabilityReplay?.matchesSnapshot ===
                  false
                    ? "mismatch"
                    : "matched"}
                </Badge>
              </div>

              <details className="mt-4 rounded-lg border border-divider p-3">
                <summary className="cursor-pointer text-sm font-medium text-text-primary">
                  Show resolver trace
                </summary>
                <ol className="mt-3 space-y-2">
                  {line.trace.map((entry, index) => (
                    <li
                      key={`${entry.stage}-${index}`}
                      className="text-sm text-text-secondary"
                    >
                      <strong className="text-text-primary">
                        {entry.stage.replace(/_/g, " ")}
                      </strong>{" "}
                      — {entry.explanation}
                    </li>
                  ))}
                </ol>
              </details>
            </Card>
          ))}
        </>
      ) : null}
    </div>
  );
};
