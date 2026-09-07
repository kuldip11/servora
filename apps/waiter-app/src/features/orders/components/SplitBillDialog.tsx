import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button, Input, Modal, SelectMenu } from "@pos/ui";
import type { Order } from "@pos/types";
import {
  splitOrderBill,
  splitOrderBillByItems,
  splitOrderBillBySeat,
} from "@/features/orders/api/orders";

type SplitMode = "EVEN" | "ITEM" | "SEAT";
type SharedStrategy = "EVEN_SPLIT" | "MANUAL";
type OrderItem = NonNullable<Order["items"]>[number];

interface Props {
  open: boolean;
  orderId: string;
  items: OrderItem[];
  onClose: () => void;
}

const isBillableItem = (item: OrderItem) =>
  item.itemStatus === "ACTIVE" ||
  (item.itemStatus === "REFIRED" && !item.compedAt);

export const SplitBillDialog = ({ open, orderId, items, onClose }: Props) => {
  const [ways, setWays] = useState("2");
  const [mode, setMode] = useState<SplitMode>("EVEN");
  const [sharedStrategy, setSharedStrategy] =
    useState<SharedStrategy>("EVEN_SPLIT");
  const [itemBills, setItemBills] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!open) return;
    setWays("2");
    setMode("EVEN");
    setSharedStrategy("EVEN_SPLIT");
    setItemBills(
      Object.fromEntries(
        items.filter(isBillableItem).map((item, index) => [item.id, index % 2]),
      ),
    );
  }, [items, open]);

  const splitBill = useMutation({
    mutationFn: ({
      billCount,
      allocations,
    }: {
      billCount: number;
      allocations?: Array<{ label: string; orderItemIds: string[] }>;
    }) =>
      allocations
        ? splitOrderBillByItems(orderId, allocations)
        : splitOrderBill(orderId, billCount),
    onSuccess: onClose,
  });
  const splitBySeat = useMutation({
    mutationFn: (strategy: SharedStrategy) =>
      splitOrderBillBySeat(orderId, strategy),
    onSuccess: (result) => {
      if (result.status !== "MANUAL_REQUIRED") {
        onClose();
        return;
      }
      const mapping: Record<string, number> = {};
      result.allocations.forEach((allocation, index) =>
        allocation.orderItemIds.forEach((id) => {
          mapping[id] = index;
        }),
      );
      result.sharedItemIds.forEach((id, index) => {
        mapping[id] = index % result.allocations.length;
      });
      setItemBills(mapping);
      setWays(String(result.allocations.length));
      setMode("ITEM");
    },
  });

  const submit = () => {
    if (mode === "SEAT") {
      splitBySeat.mutate(sharedStrategy);
      return;
    }
    const billCount = Number(ways);
    const allocations =
      mode === "ITEM"
        ? Array.from({ length: billCount }, (_, index) => ({
            label: `Bill ${index + 1}`,
            orderItemIds: items
              .filter(
                (item) =>
                  isBillableItem(item) && (itemBills[item.id] ?? 0) === index,
              )
              .map((item) => item.id),
          }))
        : undefined;
    splitBill.mutate({
      billCount,
      ...(allocations ? { allocations } : {}),
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Split bill">
      <div className="space-y-4">
        <SelectMenu
          label="Split mode"
          value={mode}
          onChange={(value) => setMode(value as SplitMode)}
          className="min-h-11 rounded-xl"
          options={[
            { value: "EVEN", label: "Even split" },
            { value: "ITEM", label: "Assign items" },
            { value: "SEAT", label: "By seat / diner" },
          ]}
        />
        {mode !== "SEAT" && (
          <Input
            label="Number of bills"
            type="number"
            min="2"
            max="20"
            value={ways}
            onChange={(event) => setWays(event.target.value)}
          />
        )}
        {mode === "SEAT" && (
          <SelectMenu
            label="Shared items"
            value={sharedStrategy}
            onChange={(value) => setSharedStrategy(value as SharedStrategy)}
            className="min-h-11 rounded-xl"
            options={[
              { value: "EVEN_SPLIT", label: "Balance across seats" },
              { value: "MANUAL", label: "Assign manually" },
            ]}
          />
        )}
        {mode === "ITEM" && (
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {items.filter(isBillableItem).map((item) => (
              <label
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-2 text-sm"
              >
                {item.quantity}× {item.menuItemName}
                <SelectMenu
                  aria-label={`Bill for ${item.menuItemName}`}
                  className="w-28 rounded-xl"
                  value={String(itemBills[item.id] ?? 0)}
                  onChange={(value) =>
                    setItemBills((current) => ({
                      ...current,
                      [item.id]: Number(value),
                    }))
                  }
                  options={Array.from(
                    { length: Number(ways) || 2 },
                    (_, index) => ({
                      value: String(index),
                      label: `Bill ${index + 1}`,
                    }),
                  )}
                />
              </label>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={splitBill.isPending || splitBySeat.isPending}
            disabled={mode !== "SEAT" && Number(ways) < 2}
            onClick={submit}
          >
            Split bill
          </Button>
        </div>
      </div>
    </Modal>
  );
};
