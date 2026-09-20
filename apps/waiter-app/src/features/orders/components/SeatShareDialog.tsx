import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { extractApiError } from "@pos/api-client";
import { Button, FormErrorSummary, Input, Modal } from "@pos/ui";
import { setOrderItemSeatShares } from "@/features/orders/api/orders";

type SeatShare = { seatLabel: string; shareRatio: number };
type SeatShareDraft = {
  id: string;
  seatLabel: string;
  shareRatio: string;
};

interface Props {
  open: boolean;
  orderId: string;
  itemId: string | null;
  initialShares: SeatShare[];
  onClose: () => void;
}

let draftSequence = 0;
const createDraft = (
  seatLabel: string,
  shareRatio: string,
): SeatShareDraft => ({
  id: `seat-share-${++draftSequence}`,
  seatLabel,
  shareRatio,
});

export const SeatShareDialog = ({
  open,
  orderId,
  itemId,
  initialShares,
  onClose,
}: Props) => {
  const queryClient = useQueryClient();
  const [shares, setShares] = useState<SeatShareDraft[]>([]);

  useEffect(() => {
    if (!open) return;
    setShares(
      initialShares.length
        ? initialShares.map((share) =>
            createDraft(share.seatLabel, String(share.shareRatio)),
          )
        : [createDraft("1", "0.5"), createDraft("2", "0.5")],
    );
  }, [initialShares, open]);

  const save = useMutation({
    mutationFn: ({
      selectedItemId,
      nextShares,
    }: {
      selectedItemId: string;
      nextShares: SeatShare[];
    }) => setOrderItemSeatShares(orderId, selectedItemId, nextShares),
    onSuccess: () => {
      void queryClient.invalidateQueries();
      onClose();
    },
  });

  const updateShares = (
    updater: (current: SeatShareDraft[]) => SeatShareDraft[],
  ) => {
    setShares(updater);
    save.reset();
  };

  const total = shares.reduce(
    (sum, share) => sum + Number(share.shareRatio || 0),
    0,
  );
  const invalid =
    !shares.length ||
    Math.abs(total - 1) > 0.0001 ||
    shares.some(
      (share) => !share.seatLabel.trim() || Number(share.shareRatio) <= 0,
    );

  return (
    <Modal open={open} onClose={onClose} title="Split item across seats">
      <div className="space-y-3">
        {shares.map((share, index) => (
          <div key={share.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <Input
              label="Seat"
              value={share.seatLabel}
              onChange={(event) =>
                updateShares((current) =>
                  current.map((value, itemIndex) =>
                    itemIndex === index
                      ? { ...value, seatLabel: event.target.value }
                      : value,
                  ),
                )
              }
            />
            <Input
              label="Ratio"
              type="number"
              min="0.01"
              max="1"
              step="0.01"
              value={share.shareRatio}
              onChange={(event) =>
                updateShares((current) =>
                  current.map((value, itemIndex) =>
                    itemIndex === index
                      ? { ...value, shareRatio: event.target.value }
                      : value,
                  ),
                )
              }
            />
            <Button
              variant="secondary"
              onClick={() =>
                updateShares((current) =>
                  current.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          variant="secondary"
          onClick={() =>
            updateShares((current) => [
              ...current,
              createDraft(String(current.length + 1), "0"),
            ])
          }
        >
          Add seat
        </Button>
        <p className="text-xs text-text-secondary">
          Ratios must total exactly 1.00.
        </p>
        <FormErrorSummary
          title="Could not save seat split"
          messages={
            save.error
              ? [extractApiError(save.error, "Could not save seat sharing.")]
              : []
          }
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={save.isPending}
            disabled={invalid || !itemId}
            onClick={() =>
              itemId &&
              save.mutate({
                selectedItemId: itemId,
                nextShares: shares.map((share) => ({
                  seatLabel: share.seatLabel.trim(),
                  shareRatio: Number(share.shareRatio),
                })),
              })
            }
          >
            Save split
          </Button>
        </div>
      </div>
    </Modal>
  );
};
