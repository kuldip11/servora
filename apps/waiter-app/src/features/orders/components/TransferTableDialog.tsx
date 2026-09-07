import { useState } from "react";
import { Button, Input, Modal, SelectMenu } from "@pos/ui";
import { useTables } from "@/features/menu/hooks/useTables";
import { useTransferTable } from "@/features/orders/hooks/useTransferTable";

interface Props {
  open: boolean;
  orderId: string;
  currentTableId?: string | null;
  onClose: () => void;
}

export const TransferTableDialog = ({
  open,
  orderId,
  currentTableId,
  onClose,
}: Props) => {
  const [destinationTableId, setDestinationTableId] = useState("");
  const [reason, setReason] = useState("");
  const transferTable = useTransferTable(orderId);
  const { data: tables = [] } = useTables(open);

  const close = () => {
    setDestinationTableId("");
    setReason("");
    onClose();
  };

  return (
    <Modal open={open} onClose={close} title="Transfer table">
      <div className="space-y-4">
        <SelectMenu
          label="Destination"
          placeholder="Select an available table"
          value={destinationTableId || undefined}
          onChange={setDestinationTableId}
          className="min-h-11 rounded-xl"
          options={tables
            .filter((table) => table.id !== currentTableId)
            .sort((left, right) =>
              left.status === right.status
                ? left.name.localeCompare(right.name)
                : left.status === "AVAILABLE"
                  ? -1
                  : 1,
            )
            .map((table) => ({
              value: table.id,
              label: table.name,
              description:
                table.status === "AVAILABLE"
                  ? `${table.capacity} seats`
                  : table.status.charAt(0) +
                    table.status.slice(1).toLowerCase(),
              group: table.status === "AVAILABLE" ? "Available" : "Unavailable",
              disabled: table.status !== "AVAILABLE",
            }))}
        />
        <Input
          label="Reason (optional)"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            disabled={!destinationTableId}
            loading={transferTable.isPending}
            onClick={() =>
              transferTable.mutate(
                { newTableId: destinationTableId, reason },
                { onSuccess: close },
              )
            }
          >
            Transfer
          </Button>
        </div>
      </div>
    </Modal>
  );
};
