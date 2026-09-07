import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Modal } from "@pos/ui";
import { refireOrderItem } from "@/features/orders/api/orders";

interface Props {
  open: boolean;
  orderId: string;
  itemId: string | null;
  onClose: () => void;
}

export const RefireItemDialog = ({ open, orderId, itemId, onClose }: Props) => {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [alsoCompOriginal, setAlsoCompOriginal] = useState(true);

  useEffect(() => {
    if (!open) return;
    setReason("");
    setAlsoCompOriginal(true);
  }, [open]);

  const refire = useMutation({
    mutationFn: ({
      selectedItemId,
      selectedReason,
      compOriginal,
    }: {
      selectedItemId: string;
      selectedReason: string;
      compOriginal: boolean;
    }) =>
      refireOrderItem(orderId, selectedItemId, selectedReason, compOriginal),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Refire item">
      <div className="space-y-4">
        <Input
          label="Reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={alsoCompOriginal}
            onChange={(event) => setAlsoCompOriginal(event.target.checked)}
          />{" "}
          Also comp original (kitchen error)
        </label>
        <p className="text-xs text-text-secondary">
          Turn off for a legitimate reorder so both lines remain billable.
        </p>
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
