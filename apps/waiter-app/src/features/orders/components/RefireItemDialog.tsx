import { useEffect, useState } from "react";
import { extractApiError } from "@pos/api-client";
import { Button, FormErrorSummary, Input, Modal } from "@pos/ui";
import { useRefireOrderItem } from "@/features/orders/hooks/useOrderActions";

interface Props {
  open: boolean;
  orderId: string;
  itemId: string | null;
  onClose: () => void;
}

export const RefireItemDialog = ({ open, orderId, itemId, onClose }: Props) => {
  const [reason, setReason] = useState("");
  const [alsoCompOriginal, setAlsoCompOriginal] = useState(true);

  useEffect(() => {
    if (!open) return;
    setReason("");
    setAlsoCompOriginal(true);
  }, [open]);

  const refire = useRefireOrderItem(orderId, onClose);

  return (
    <Modal open={open} onClose={onClose} title="Refire item">
      <div className="space-y-4">
        <Input
          label="Reason"
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            refire.reset();
          }}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={alsoCompOriginal}
            onChange={(event) => {
              setAlsoCompOriginal(event.target.checked);
              refire.reset();
            }}
          />{" "}
          Also comp original (kitchen error)
        </label>
        <p className="text-xs text-text-secondary">
          Turn off for a legitimate reorder so both lines remain billable.
        </p>
        <FormErrorSummary
          title="Refire failed"
          messages={
            refire.error
              ? [extractApiError(refire.error, "Could not refire this item.")]
              : []
          }
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!reason.trim() || !itemId}
            loading={refire.isPending}
            onClick={() =>
              itemId &&
              refire.mutate({
                selectedItemId: itemId,
                selectedReason: reason.trim(),
                compOriginal: alsoCompOriginal,
              })
            }
          >
            Refire
          </Button>
        </div>
      </div>
    </Modal>
  );
};
