import { useState } from "react";
import { Button, Input, Modal, Select } from "@pos/ui";
import type { Order } from "@pos/types";
import { useMergeOrders, useTransferTable } from "@/features/orders";
import type { RestaurantTable } from "@/features/tables/types";

export const TransferTableDialog = ({
  source,
  tables,
  openOrders,
  onClose,
}: {
  source: RestaurantTable | null;
  tables: RestaurantTable[];
  openOrders: Order[];
  onClose: () => void;
}) => {
  const [destinationId, setDestinationId] = useState("");
  const [reason, setReason] = useState("");
  const transferMutation = useTransferTable();
  if (!source) return null;
  const transferOrder = openOrders.find((order) => order.tableId === source.id);

  const close = () => {
    setDestinationId("");
    setReason("");
    onClose();
  };

  return (
    <Modal open onClose={close} title={`Transfer ${source.name}`}>
      <div className="space-y-4">
        <Select
          label="Destination"
          value={destinationId}
          onChange={setDestinationId}
          options={[
            { value: "", label: "Select an available table" },
            ...tables
              .filter(
                (table) =>
                  table.status === "AVAILABLE" &&
                  table.branchId === source.branchId,
              )
              .map((table) => ({ value: table.id, label: table.name })),
          ]}
        />
        <Input
          label="Reason (optional)"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        {!transferOrder && (
          <p className="text-sm text-danger">
            No open order was found for this table.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            disabled={!transferOrder || !destinationId}
            loading={transferMutation.isPending}
            onClick={() => {
              if (!transferOrder) return;
              transferMutation.mutate(
                {
                  orderId: transferOrder.id,
                  newTableId: destinationId,
                  reason,
                },
                { onSuccess: close },
              );
            }}
          >
            Transfer
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export const MergeTableDialog = ({
  source,
  tables,
  openOrders,
  onClose,
}: {
  source: RestaurantTable | null;
  tables: RestaurantTable[];
  openOrders: Order[];
  onClose: () => void;
}) => {
  const [targetOrderId, setTargetOrderId] = useState("");
  const mergeMutation = useMergeOrders();
  if (!source) return null;
  const sourceOrder = openOrders.find((order) => order.tableId === source.id);

  return (
    <Modal open onClose={onClose} title={`Merge ${source.name}`}>
      <div className="space-y-4">
        <Select
          label="Merge billing into"
          value={targetOrderId}
          onChange={setTargetOrderId}
          options={[
            { value: "", label: "Select another occupied table" },
            ...openOrders
              .filter(
                (order) =>
                  order.tableId !== source.id && !order.mergedIntoOrderId,
              )
              .map((order) => {
                const table = tables.find(
                  (candidate) => candidate.id === order.tableId,
                );
                return {
                  value: order.id,
                  label: table?.name ?? `Order ${order.id.slice(-8)}`,
                };
              }),
          ]}
        />
        <p className="text-xs text-text-secondary">
          Kitchen tickets remain separate. The orders will share one combined
          bill.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!targetOrderId}
            loading={mergeMutation.isPending}
            onClick={() => {
              if (sourceOrder) {
                mergeMutation.mutate(
                  {
                    sourceOrderId: sourceOrder.id,
                    targetOrderId,
                  },
                  {
                    onSuccess: () => {
                      setTargetOrderId("");
                      onClose();
                    },
                  },
                );
              }
            }}
          >
            Merge tables
          </Button>
        </div>
      </div>
    </Modal>
  );
};
