import { Badge, Button, Card, Modal, Spinner } from "@pos/ui";
import { formatCurrency } from "@/shared/utils/format";

import { useOrderExplanation } from "@/features/orders/hooks/useOrderExplanation";
export const OrderExplainDialog = ({
  open,
  orderId,
  onClose,
}: {
  open: boolean;
  orderId: string;
  onClose: () => void;
}) => {
  const explanationQuery = useOrderExplanation(orderId, { enabled: open });
  const explanation = explanationQuery.data;
  const loading = explanationQuery.isLoading;
  const error = explanationQuery.error;

  return (
    <Modal open={open} onClose={onClose} title="Explain this order" size="xl">
      {loading ? (
        <div className="flex min-h-40 items-center justify-center">
          <Spinner className="h-6 w-6" />
        </div>
      ) : error ? (
        <Card className="border-danger/30 bg-danger-surface">
          <p className="text-sm font-semibold text-danger">
            Unable to reconstruct this order
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {error instanceof Error ? error.message : "Request failed"}
          </p>
        </Card>
      ) : explanation ? (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  Resolution time
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {new Date(explanation.asOf).toLocaleString()}
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
            <p className="mt-3 text-sm text-text-secondary">
              {explanation.historyNotice}
            </p>
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
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
                <span className="text-text-secondary">Total</span>
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
                    Resolved {new Date(line.asOf).toLocaleString()}
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

              {line.availabilityAtOrder && (
                <div className="mt-4 rounded-lg bg-surface-secondary p-3 text-sm">
                  <p className="font-medium text-text-primary">
                    Availability at fire time
                  </p>
                  <p className="mt-1 text-text-secondary">
                    {line.availabilityAtOrder.effectiveStatus} ·{" "}
                    {line.availabilityAtOrder.cause} ·{" "}
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

              <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <span className="text-text-secondary">
                    Winning price source
                  </span>
                  <strong className="block text-text-primary">
                    {line.pricingReplay.priceSource?.description ??
                      "Menu-item base price"}
                  </strong>
                </div>
                <div>
                  <span className="text-text-secondary">
                    Stored line subtotal
                  </span>
                  <strong className="block text-text-primary">
                    {formatCurrency(line.pricingReplay.persistedSubtotal)}
                  </strong>
                </div>
                <div>
                  <span className="text-text-secondary">
                    Persisted attribution check
                  </span>
                  <strong
                    className={
                      line.pricingReplay.matchesSnapshot
                        ? "block text-success"
                        : "block text-warning"
                    }
                  >
                    {line.pricingReplay.matchesSnapshot
                      ? "Matches snapshot"
                      : "Attribution mismatch"}
                  </strong>
                </div>
                <div>
                  <span className="text-text-secondary">
                    AvailabilityResolver replay
                  </span>
                  <strong
                    className={
                      line.authoritativeAvailabilityReplay?.matchesSnapshot
                        ? "block text-success"
                        : "block text-warning"
                    }
                  >
                    {line.authoritativeAvailabilityReplay?.matchesSnapshot
                      ? "Matches snapshot"
                      : "Mismatch"}
                  </strong>
                </div>
                <div>
                  <span className="text-text-secondary">
                    PricingPipeline replay
                  </span>
                  <strong
                    className={
                      line.authoritativePricingReplay?.matchesSnapshot
                        ? "block text-success"
                        : "block text-warning"
                    }
                  >
                    {line.authoritativePricingReplay?.matchesSnapshot
                      ? "Matches snapshot"
                      : "Mismatch"}
                  </strong>
                </div>
              </div>

              <ol className="mt-4 space-y-2">
                {line.trace.map((entry, index) => (
                  <li
                    key={`${entry.stage}:${index}`}
                    className="flex gap-3 text-sm"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-surface text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-text-primary">
                        {entry.stage.replace(/_/g, " ")}
                      </p>
                      <p className="text-text-secondary">{entry.explanation}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          ))}

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
