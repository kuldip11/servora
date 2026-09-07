import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button, Input, Modal, Select } from "@pos/ui";
import type { Order } from "@pos/types";
import { billingService } from "@/features/billing/services/billing.service";
import { queryClient } from "@/shared/lib/query-client";
import { notifyError, notifySuccess } from "@/shared/lib/notify";

type SplitMode = "EVEN" | "ITEM" | "SEAT";
type SharedStrategy = "EVEN_SPLIT" | "MANUAL";

const activeItems = (items: NonNullable<Order["items"]>) =>
  items.filter(
    (item) =>
      item.itemStatus === "ACTIVE" ||
      (item.itemStatus === "REFIRED" && !item.compedAt),
  );

const buildItemBillMapping = (
  items: NonNullable<Order["items"]>,
  ways: number,
  seeded: Record<string, number> = {},
) => {
  const active = activeItems(items);
  const groups = new Map<string, typeof active>();
  for (const item of active) {
    const key = item.comboGroupId
      ? `combo:${item.comboGroupId}`
      : `item:${item.id}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const mapping = { ...seeded };
  [...groups.values()].forEach((group, groupIndex) => {
    const seededBill = group
      .map((item) => seeded[item.id])
      .find((value) => value !== undefined);
    const billIndex = seededBill ?? groupIndex % Math.max(1, ways);
    group.forEach((item) => {
      mapping[item.id] = billIndex;
    });
  });
  return mapping;
};

const updateItemBillMapping = (
  current: Record<string, number>,
  items: NonNullable<Order["items"]>,
  itemId: string,
  billIndex: number,
) => {
  const target = items.find((item) => item.id === itemId);
  if (!target?.comboGroupId) return { ...current, [itemId]: billIndex };
  const next = { ...current };
  items
    .filter((item) => item.comboGroupId === target.comboGroupId)
    .forEach((item) => {
      next[item.id] = billIndex;
    });
  return next;
};

export const SplitBillDialog = ({
  order,
  onClose,
}: {
  order: Order | null;
  onClose: () => void;
}) => {
  const [ways, setWays] = useState("2");
  const [mode, setMode] = useState<SplitMode>("EVEN");
  const [sharedStrategy, setSharedStrategy] =
    useState<SharedStrategy>("EVEN_SPLIT");
  const [itemBills, setItemBills] = useState<Record<string, number>>(() =>
    order ? buildItemBillMapping(order.items ?? [], 2) : {},
  );

  const splitMutation = useMutation({
    mutationFn: ({
      orderId,
      splitWays,
      allocations,
    }: {
      orderId: string;
      splitWays: number;
      allocations?: Array<{ label: string; orderItemIds: string[] }>;
    }) =>
      allocations
        ? billingService.splitOrderByItems(orderId, allocations)
        : billingService.splitOrder(orderId, splitWays),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing"] });
      notifySuccess("Bill split successfully");
      onClose();
    },
    onError: (error) => notifyError(error, "Unable to split bill"),
  });

  const seatSplitMutation = useMutation({
    mutationFn: ({
      orderId,
      strategy,
    }: {
      orderId: string;
      strategy: SharedStrategy;
    }) => billingService.splitOrderBySeat(orderId, strategy),
    onSuccess: (result) => {
      if (result.status === "MANUAL_REQUIRED") {
        const mapping: Record<string, number> = {};
        result.allocations.forEach((allocation, index) =>
          allocation.orderItemIds.forEach((id) => {
            mapping[id] = index;
          }),
        );
        const sharedIds = new Set(result.sharedItemIds);
        const sharedItems = (order?.items ?? []).filter((item) =>
          sharedIds.has(item.id),
        );
        setItemBills(
          buildItemBillMapping(sharedItems, result.allocations.length, mapping),
        );
        setWays(String(result.allocations.length));
        setMode("ITEM");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["billing"] });
      notifySuccess("Bill split by seat");
      onClose();
    },
    onError: (error) => notifyError(error, "Unable to split by seat"),
  });

  if (!order) return null;
  const splitWays = Number(ways);

  const submit = () => {
    if (mode === "SEAT") {
      seatSplitMutation.mutate({ orderId: order.id, strategy: sharedStrategy });
      return;
    }
    const allocations =
      mode === "ITEM"
        ? Array.from({ length: splitWays }, (_, index) => ({
            label: `Bill ${index + 1}`,
            orderItemIds: activeItems(order.items ?? [])
              .filter((item) => (itemBills[item.id] ?? 0) === index)
              .map((item) => item.id),
          }))
        : undefined;
    splitMutation.mutate({
      orderId: order.id,
      splitWays,
      ...(allocations ? { allocations } : {}),
    });
  };

  return (
    <Modal open onClose={onClose} title="Split bill" size="sm">
      <div className="space-y-4">
        <Select
          label="Split mode"
          value={mode}
          onChange={(event) => setMode(event.target.value as SplitMode)}
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
            onChange={(event) => {
              const nextWays = event.target.value;
              setWays(nextWays);
              if (mode === "ITEM") {
                setItemBills((current) =>
                  buildItemBillMapping(
                    order.items ?? [],
                    Number(nextWays) || 2,
                    current,
                  ),
                );
              }
            }}
          />
        )}
        {mode === "SEAT" && (
          <Select
            label="Shared items"
            value={sharedStrategy}
            onChange={(event) =>
              setSharedStrategy(event.target.value as SharedStrategy)
            }
            options={[
              { value: "EVEN_SPLIT", label: "Balance across seats" },
              { value: "MANUAL", label: "Assign manually" },
            ]}
          />
        )}
        {mode === "ITEM" && (
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {activeItems(order.items ?? []).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-2"
              >
                <span className="text-sm">
                  {item.quantity}× {item.menuItemName}
                </span>
                <Select
                  value={String(itemBills[item.id] ?? 0)}
                  onChange={(event) =>
                    setItemBills((current) =>
                      updateItemBillMapping(
                        current,
                        order.items ?? [],
                        item.id,
                        Number(event.target.value),
                      ),
                    )
                  }
                  options={Array.from(
                    { length: splitWays || 2 },
                    (_, index) => ({
                      value: String(index),
                      label: `Bill ${index + 1}`,
                    }),
                  )}
                />
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-text-secondary">
          Every active item must belong to exactly one non-empty bill.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={splitMutation.isPending || seatSplitMutation.isPending}
            disabled={mode !== "SEAT" && splitWays < 2}
            onClick={submit}
          >
            Split bill
          </Button>
        </div>
      </div>
    </Modal>
  );
};
