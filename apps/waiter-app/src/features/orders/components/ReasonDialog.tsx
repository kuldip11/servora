import { useState } from "react";
import type { CancellationReason } from "@pos/types";
import {
  Button,
  Input,
  Modal,
  QueryErrorState,
  SelectMenu,
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
  onSubmit: (reason: {
    cancellationReasonId?: string;
    reason?: string;
  }) => void;
}) => {
  const [reasonId, setReasonId] = useState("");
  const [other, setOther] = useState("");
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
        <SelectMenu
          label="Reason"
          value={reasonId}
          onChange={setReasonId}
          className="min-h-11 rounded-xl"
          options={[
            { value: "", label: "Other" },
            ...reasons.map((reason) => ({
              value: reason.id,
              label: reason.label,
            })),
          ]}
        />
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
            disabled={
              Boolean(reasonsError && !reasonsStale) ||
              (!reasonId && !other.trim())
            }
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
