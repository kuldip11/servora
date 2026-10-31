import { ValidationError } from "@/core/errors";
import type {
  ItemAllocation,
  ItemShareAllocation,
} from "./billing-split-validation";

export const buildSeatAllocationPlan = (
  items: Array<{
    id: string;
    seatLabel: string | null;
    subtotal: string | number;
    taxRate: string | number;
    taxMode?: "INCLUSIVE" | "EXCLUSIVE";
    comboGroupId?: string | null;
  }>,
  sharedItemStrategy: "EVEN_SPLIT" | "MANUAL",
) => {
  const labels = [
    ...new Set(
      items
        .map((item) => item.seatLabel?.trim())
        .filter((label): label is string => !!label),
    ),
  ];
  if (labels.length === 0) return { status: "no_seats" as const };
  const allocations = labels.map((label) => ({
    label,
    orderItemIds: [] as string[],
  }));

  const units = new Map<string, typeof items>();
  for (const item of items) {
    const key = item.comboGroupId
      ? `combo:${item.comboGroupId}`
      : `item:${item.id}`;
    units.set(key, [...(units.get(key) ?? []), item]);
  }

  const weightOf = (unit: typeof items) =>
    unit.reduce(
      (sum, item) =>
        sum +
        Number(item.subtotal) *
          (item.taxMode === "INCLUSIVE" ? 1 : 1 + Number(item.taxRate) / 100),
      0,
    );
  const sharedUnits: Array<{ items: typeof items; weight: number }> = [];

  for (const unit of units.values()) {
    const unitLabels = [
      ...new Set(
        unit
          .map((item) => item.seatLabel?.trim())
          .filter((label): label is string => !!label),
      ),
    ];
    if (unitLabels.length === 1) {
      const allocation = allocations.find(
        (entry) => entry.label === unitLabels[0],
      )!;
      allocation.orderItemIds.push(...unit.map((item) => item.id));
    } else {
      sharedUnits.push({ items: unit, weight: weightOf(unit) });
    }
  }

  if (sharedUnits.length && sharedItemStrategy === "MANUAL") {
    return {
      status: "manual_required" as const,
      allocations,
      sharedItemIds: sharedUnits.flatMap((unit) =>
        unit.items.map((item) => item.id),
      ),
    };
  }

  const allocationWeight = (allocation: ItemAllocation) =>
    allocation.orderItemIds.reduce((sum, id) => {
      const item = items.find((candidate) => candidate.id === id)!;
      return (
        sum +
        Number(item.subtotal) *
          (item.taxMode === "INCLUSIVE" ? 1 : 1 + Number(item.taxRate) / 100)
      );
    }, 0);
  const weights = allocations.map(allocationWeight);
  for (const unit of sharedUnits) {
    const lightest = weights.indexOf(Math.min(...weights));
    allocations[lightest]!.orderItemIds.push(
      ...unit.items.map((item) => item.id),
    );
    weights[lightest]! += unit.weight;
  }
  return { status: "complete" as const, allocations };
};

export const buildFractionalSeatAllocationPlan = (
  items: Array<{
    id: string;
    seatLabel: string | null;
    subtotal: string | number;
    taxRate: string | number;
    taxMode?: "INCLUSIVE" | "EXCLUSIVE";
    comboGroupId?: string | null;
    seatShares?: Array<{ seatLabel: string; shareRatio: string | number }>;
  }>,
  sharedItemStrategy: "EVEN_SPLIT" | "MANUAL",
) => {
  if (!items.some((item) => item.seatShares?.length)) return null;
  const labels = [
    ...new Set(
      items.flatMap((item) => [
        ...(item.seatLabel?.trim() ? [item.seatLabel.trim()] : []),
        ...(item.seatShares ?? [])
          .map((share) => share.seatLabel.trim())
          .filter(Boolean),
      ]),
    ),
  ];
  if (!labels.length) return { status: "no_seats" as const };
  const allocations: ItemShareAllocation[] = labels.map((label) => ({
    label,
    itemShares: [],
  }));
  const allocationFor = (label: string) =>
    allocations.find((entry) => entry.label === label)!;
  const unresolved: typeof items = [];

  for (const item of items) {
    if (item.seatShares?.length) {
      const total = item.seatShares.reduce(
        (sum, share) => sum + Number(share.shareRatio),
        0,
      );
      if (Math.abs(total - 1) > 0.000001)
        throw new ValidationError(
          "Seat-share ratios for an order item must total 1",
          { reason: "INVALID_SEAT_SHARE_TOTAL" },
        );
      for (const share of item.seatShares) {
        allocationFor(share.seatLabel.trim()).itemShares.push({
          orderItemId: item.id,
          shareRatio: Number(share.shareRatio),
        });
      }
    } else if (item.seatLabel?.trim()) {
      allocationFor(item.seatLabel.trim()).itemShares.push({
        orderItemId: item.id,
        shareRatio: 1,
      });
    } else {
      unresolved.push(item);
    }
  }

  if (unresolved.length && sharedItemStrategy === "MANUAL") {
    return {
      status: "manual_required" as const,
      allocations: allocations.map((allocation) => ({
        label: allocation.label,
        orderItemIds: allocation.itemShares.map((share) => share.orderItemId),
      })),
      sharedItemIds: unresolved.map((item) => item.id),
    };
  }

  const weightForAllocation = (allocation: ItemShareAllocation) =>
    allocation.itemShares.reduce((sum, share) => {
      const item = items.find(
        (candidate) => candidate.id === share.orderItemId,
      )!;
      return (
        sum +
        Number(item.subtotal) *
          (item.taxMode === "INCLUSIVE" ? 1 : 1 + Number(item.taxRate) / 100) *
          share.shareRatio
      );
    }, 0);
  const weights = allocations.map(weightForAllocation);
  for (const item of unresolved) {
    const lightest = weights.indexOf(Math.min(...weights));
    allocations[lightest]!.itemShares.push({
      orderItemId: item.id,
      shareRatio: 1,
    });
    weights[lightest]! +=
      Number(item.subtotal) *
      (item.taxMode === "INCLUSIVE" ? 1 : 1 + Number(item.taxRate) / 100);
  }
  return { status: "complete" as const, allocations };
};
