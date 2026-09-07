import { useState } from "react";
import { Button, Input, Modal } from "@pos/ui";
import { useRefireOrderItem } from "@/features/orders/hooks/useRefireOrderItem";

export const RefireItemDialog = ({
  orderId,
  itemId,
  onClose,
}: {
  orderId: string;
  itemId: string;
  onClose: () => void;
}) => {
  const [reason, setReason] = useState("");
  const [zeroPriceReplacement, setZeroPriceReplacement] = useState(true);
  const mutation = useRefireOrderItem(orderId);

  return (
    <Modal open onClose={onClose} title="Refire item">
      <div className="space-y-4">
        <Input
          label="Reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Kitchen error / remake"
        />
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={zeroPriceReplacement}
            onChange={(event) => setZeroPriceReplacement(event.target.checked)}
          />
          Also comp original (kitchen error; bill replacement once)
        </label>
        <p className="text-xs text-text-secondary">
          Turn this off for a legitimate reorder; both the original and refire
          are billed.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!reason.trim()}
            loading={mutation.isPending}
            onClick={() =>
              mutation.mutate(
                {
                  itemId,
                  reason: reason.trim(),
                  alsoCompOriginal: zeroPriceReplacement,
                },
                { onSuccess: onClose },
              )
            }
          >
            Refire
          </Button>
        </div>
      </div>
    </Modal>
  );
};
