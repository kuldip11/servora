import { useState } from "react";
import { Button, Input, Modal, Select } from "@pos/ui";
import type { InventoryItem } from "@pos/types";
import { useWasteReasons } from "@/features/inventory/hooks/useWasteReasons";
import {
  useCreateWasteReason,
  useLogInventoryWaste,
} from "@/features/inventory/hooks/useLogInventoryWaste";

export const InventoryWasteDialog = ({
  item,
  onClose,
}: {
  item: InventoryItem | null;
  onClose: () => void;
}) => {
  const [quantity, setQuantity] = useState("1");
  const [reasonId, setReasonId] = useState("");
  const [newReason, setNewReason] = useState("");
  const [notes, setNotes] = useState("");
  const { data: reasons } = useWasteReasons();
  const logMutation = useLogInventoryWaste();
  const createReasonMutation = useCreateWasteReason();
  if (!item) return null;
  const close = () => {
    setQuantity("1");
    setReasonId("");
    setNewReason("");
    setNotes("");
    onClose();
  };
  return (
    <Modal open onClose={close} title={`Log Waste: ${item.name}`} size="sm">
      <div className="space-y-4">
        <Input
          label="Quantity wasted"
          type="number"
          min="0.001"
          step="0.001"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          hint={`Current stock: ${parseFloat(String(item.currentStock ?? 0)).toFixed(2)} ${item.unit ?? ""}`}
        />
        <Select
          label="Waste reason"
          value={reasonId}
          onChange={(e) => setReasonId(e.target.value)}
          options={[
            { value: "", label: "Select reason" },
            ...(reasons ?? []).map((reason) => ({
              value: reason.id,
              label: reason.label,
            })),
          ]}
        />
        <div className="rounded-md border border-border p-3">
          <p className="mb-2 text-xs font-medium text-text-secondary">
            Need a new reason?
          </p>
          <div className="flex gap-2">
            <Input
              aria-label="New waste reason"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="e.g. Prep trim"
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!newReason.trim() || createReasonMutation.isPending}
              onClick={() =>
                createReasonMutation.mutate(newReason.trim(), {
                  onSuccess: (reason) => {
                    setReasonId(reason.id);
                    setNewReason("");
                  },
                })
              }
            >
              Add
            </Button>
          </div>
        </div>
        <Input
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            disabled={!reasonId || !(Number(quantity) > 0)}
            loading={logMutation.isPending}
            onClick={() =>
              logMutation.mutate(
                {
                  itemId: item.id,
                  quantity: Number(quantity),
                  wasteReasonId: reasonId,
                  ...(notes ? { notes } : {}),
                },
                { onSuccess: close },
              )
            }
          >
            Log Waste
          </Button>
        </div>
      </div>
    </Modal>
  );
};
