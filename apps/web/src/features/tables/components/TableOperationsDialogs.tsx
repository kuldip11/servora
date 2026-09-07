import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button, Input, Modal } from "@pos/ui";
import type { Order } from "@pos/types";
import { useTransferTable } from "@/features/orders/hooks/useTransferTable";
import { ordersService } from "@/features/orders/services/orders.service";
import type { RestaurantTable } from "@/features/tables/types";
import { queryClient } from "@/shared/lib/query-client";
import { notifyError, notifySuccess } from "@/shared/lib/notify";

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
        <label className="block text-sm font-medium text-text-primary">
          Destination
          <select
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2"
            value={destinationId}
            onChange={(event) => setDestinationId(event.target.value)}
          >
            <option value="">Select an available table</option>
            {tables
              .filter(
                (table) =>
                  table.status === "AVAILABLE" &&
                  table.branchId === source.branchId,
              )
              .map((table) => (
                <option key={table.id} value={table.id}>
                  {table.name}
                </option>
              ))}
          </select>
        </label>
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
  const mergeMutation = useMutation({
    mutationFn: ({
      sourceOrderId,
      targetOrderId,
    }: {
      sourceOrderId: string;
      targetOrderId: string;
    }) => ordersService.mergeOrders(sourceOrderId, targetOrderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      notifySuccess("Tables merged for billing");
      setTargetOrderId("");
      onClose();
    },
    onError: (error) => notifyError(error, "Unable to merge tables"),
  });
  if (!source) return null;
  const sourceOrder = openOrders.find((order) => order.tableId === source.id);

  return (
    <Modal open onClose={onClose} title={`Merge ${source.name}`}>
      <div className="space-y-4">
        <label className="block text-sm font-medium text-text-primary">
          Merge billing into
          <select
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2"
            value={targetOrderId}
            onChange={(event) => setTargetOrderId(event.target.value)}
          >
            <option value="">Select another occupied table</option>
            {openOrders
              .filter(
                (order) =>
                  order.tableId !== source.id && !order.mergedIntoOrderId,
              )
              .map((order) => {
                const table = tables.find(
                  (candidate) => candidate.id === order.tableId,
                );
                return (
                  <option key={order.id} value={order.id}>
                    {table?.name ?? `Order ${order.id.slice(-8)}`}
                  </option>
                );
              })}
          </select>
        </label>
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
                mergeMutation.mutate({
                  sourceOrderId: sourceOrder.id,
                  targetOrderId,
                });
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
