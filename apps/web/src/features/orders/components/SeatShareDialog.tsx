import { useState } from "react";
import { Button, Input, Modal } from "@pos/ui";
import { useSetOrderItemSeatShares } from "@/features/orders/hooks/useSetOrderItemSeatShares";

type SeatShare = { seatLabel: string; shareRatio: string | number };
type DraftShare = { id: string; seatLabel: string; shareRatio: string };

let draftSequence = 0;
const createDraft = (seatLabel: string, shareRatio: string): DraftShare => ({
  id: `seat-share-${++draftSequence}`,
  seatLabel,
  shareRatio,
});

export const SeatShareDialog = ({
  orderId,
  itemId,
  initialShares,
  onClose,
}: {
  orderId: string;
  itemId: string;
  initialShares: SeatShare[];
  onClose: () => void;
}) => {
  const [shares, setShares] = useState<DraftShare[]>(() =>
    initialShares.length
      ? initialShares.map((share) =>
          createDraft(share.seatLabel, String(share.shareRatio)),
        )
      : [createDraft("1", "0.5"), createDraft("2", "0.5")],
  );
  const mutation = useSetOrderItemSeatShares(orderId);
  const total = shares.reduce(
    (sum, share) => sum + Number(share.shareRatio || 0),
    0,
  );
  const invalid =
    shares.some(
      (share) => !share.seatLabel.trim() || Number(share.shareRatio) <= 0,
    ) || Math.abs(total - 1) >= 0.000001;

  return (
    <Modal open onClose={onClose} title="Split item across seats">
      <div className="space-y-3">
        <p className="text-sm text-text-secondary">
          Ratios must total exactly 1.00. Use equal shares or enter an
          intentional unequal split.
        </p>
        {shares.map((share, index) => (
          <div
            key={share.id}
            className="grid grid-cols-[1fr_1fr_auto] items-end gap-2"
          >
            <Input
              label={`Seat ${index + 1}`}
              value={share.seatLabel}
              onChange={(event) =>
                setShares((current) =>
                  current.map((value, valueIndex) =>
                    valueIndex === index
                      ? { ...value, seatLabel: event.target.value }
                      : value,
                  ),
                )
              }
            />
            <Input
              label="Share ratio"
              type="number"
              min="0.01"
              max="1"
              step="0.01"
              value={share.shareRatio}
              onChange={(event) =>
                setShares((current) =>
                  current.map((value, valueIndex) =>
                    valueIndex === index
                      ? { ...value, shareRatio: event.target.value }
                      : value,
                  ),
                )
              }
            />
            {shares.length > 2 && (
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setShares((current) =>
                    current.filter((_, valueIndex) => valueIndex !== index),
                  )
                }
              >
                Remove
              </Button>
            )}
          </div>
        ))}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setShares((current) => [
                ...current,
                createDraft(String(current.length + 1), "0"),
              ])
            }
          >
            + Seat
          </Button>
          <span
            className={`text-sm font-medium ${Math.abs(total - 1) < 0.000001 ? "text-success" : "text-danger"}`}
          >
            Total {total.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            loading={mutation.isPending}
            disabled={invalid}
            onClick={() =>
              mutation.mutate(
                {
                  itemId,
                  shares: shares.map((share) => ({
                    seatLabel: share.seatLabel.trim(),
                    shareRatio: Number(share.shareRatio),
                  })),
                },
                { onSuccess: onClose },
              )
            }
          >
            Save split
          </Button>
        </div>
      </div>
    </Modal>
  );
};
