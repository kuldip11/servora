import { useState } from "react";
import { extractApiError } from "@pos/api-client";
import {
  Button,
  FormErrorSummary,
  Modal,
  QueryErrorState,
  Select,
} from "@pos/ui";
import {
  useMergeCandidates,
  useMergeOrder,
} from "@/features/orders/hooks/useOrderActions";

interface Props {
  open: boolean;
  orderId: string;
  onClose: () => void;
}

export const MergeOrderDialog = ({ open, orderId, onClose }: Props) => {
  const [targetId, setTargetId] = useState("");
  const candidatesQuery = useMergeCandidates(open);
  const mergeOrder = useMergeOrder(orderId, () => {
    setTargetId("");
    onClose();
  });

  const candidates = candidatesQuery.data ?? [];

  return (
    <Modal open={open} onClose={onClose} title="Merge table">
      <div className="space-y-4">
        {candidatesQuery.isError && !candidatesQuery.data ? (
          <QueryErrorState
            title="Unable to load open tables"
            description={extractApiError(
              candidatesQuery.error,
              "Could not load merge candidates.",
            )}
            onRetry={() => void candidatesQuery.refetch()}
            isRetrying={candidatesQuery.isFetching}
          />
        ) : (
          <Select
            label="Merge billing into"
            placeholder="Select another open table"
            value={targetId || undefined}
            onChange={(value) => {
              setTargetId(value);
              mergeOrder.reset();
            }}
            className="min-h-11 rounded-xl"
            options={candidates
              .filter(
                (candidate) =>
                  candidate.id !== orderId &&
                  candidate.status === "OPEN" &&
                  candidate.type === "DINE_IN" &&
                  !candidate.mergedIntoOrderId,
              )
              .map((candidate) => ({
                value: candidate.id,
                label:
                  candidate.table?.name ?? `Order ${candidate.id.slice(-8)}`,
              }))}
          />
        )}
        <p className="text-xs text-text-secondary">
          Kitchen tickets stay separate; only billing is combined.
        </p>
        <FormErrorSummary
          title="Merge failed"
          messages={
            mergeOrder.error
              ? [
                  extractApiError(
                    mergeOrder.error,
                    "Could not merge these orders.",
                  ),
                ]
              : []
          }
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!targetId || candidatesQuery.isError}
            loading={mergeOrder.isPending}
            onClick={() => mergeOrder.mutate(targetId)}
          >
            Merge
          </Button>
        </div>
      </div>
    </Modal>
  );
};
