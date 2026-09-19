import { useState } from "react";
import type { CancellationReason } from "@pos/types";
import {
  Button,
  Input,
  Modal,
  QueryErrorState,
  StaleDataBanner,
} from "@pos/ui";

export const ReasonDialog = ({
  open,
  title,
  reasons,
  loading,
  reasonsError,
  reasonsStale,
  reasonsRetrying,
  onRetryReasons,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  reasons: CancellationReason[];
  loading?: boolean;
  reasonsError?: string;
  reasonsStale?: boolean;
  reasonsRetrying?: boolean;
  onRetryReasons?: () => void;
  onClose: () => void;
  onSubmit: (input: { cancellationReasonId?: string; reason?: string }) => void;
}) => {
  const [reasonId, setReasonId] = useState("");
  const [other, setOther] = useState("");
  const valid = Boolean(reasonId || other.trim());
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        {reasonsStale ? (
          <StaleDataBanner
            message="Cancellation reasons refresh failed — showing the latest available reasons."
            isRetrying={reasonsRetrying}
            onRetry={onRetryReasons}
          />
        ) : null}
        {reasonsError && !reasonsStale ? (
          <QueryErrorState
            title="Unable to load cancellation reasons"
            description={reasonsError}
            isRetrying={reasonsRetrying}
            onRetry={onRetryReasons}
          />
        ) : null}
        <label className="block text-sm font-medium text-text-primary">
          Reason
          <select
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2"
            value={reasonId}
            onChange={(event) => setReasonId(event.target.value)}
          >
            <option value="">Other</option>
            {reasons.map((reason) => (
              <option key={reason.id} value={reason.id}>
                {reason.label}
              </option>
            ))}
          </select>
        </label>
        {!reasonId && (
          <Input
            label="Other reason"
            value={other}
            onChange={(event) => setOther(event.target.value)}
          />
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!valid || Boolean(reasonsError && !reasonsStale)}
            loading={Boolean(loading)}
            onClick={() =>
              onSubmit({
                ...(reasonId ? { cancellationReasonId: reasonId } : {}),
                ...(other.trim() ? { reason: other.trim() } : {}),
              })
            }
          >
            Confirm
          </Button>
        </div>
      </div>
    </Modal>
  );
};
