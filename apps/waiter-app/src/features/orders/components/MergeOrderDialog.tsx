import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Modal, SelectMenu } from "@pos/ui";
import { fetchOrders, mergeOrders } from "@/features/orders/api/orders";

interface Props {
  open: boolean;
  orderId: string;
  onClose: () => void;
}

export const MergeOrderDialog = ({ open, orderId, onClose }: Props) => {
  const [targetId, setTargetId] = useState("");
  const { data: candidates = [] } = useQuery({
    queryKey: ["orders", "merge-candidates"],
    queryFn: async () =>
      (await fetchOrders({ view: "ACTIVE", limit: 100 })).items,
    enabled: open,
  });
  const mergeOrder = useMutation({
    mutationFn: (selectedTargetId: string) =>
      mergeOrders(orderId, selectedTargetId),
    onSuccess: () => {
      setTargetId("");
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Merge table">
      <div className="space-y-4">
        <SelectMenu
          label="Merge billing into"
          placeholder="Select another open table"
          value={targetId || undefined}
          onChange={setTargetId}
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
              label: candidate.table?.name ?? `Order ${candidate.id.slice(-8)}`,
            }))}
        />
        <p className="text-xs text-text-secondary">
          Kitchen tickets stay separate; only billing is combined.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!targetId}
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
