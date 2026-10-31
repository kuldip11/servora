import { ValidationError } from "@/core/errors";
import { splitMoneyEvenly } from "./billing-split-money";

export type ItemAllocation = { label?: string; orderItemIds: string[] };
export type ItemShareAllocation = {
  label?: string;
  itemShares: Array<{ orderItemId: string; shareRatio: number }>;
};
export type BillableOrderItem = { id: string; comboGroupId?: string | null };

export const validateItemShareAllocations = (
  activeItemIds: string[],
  allocations: ItemShareAllocation[],
):
  | { ok: true }
  | {
      ok: false;
      reason:
        "EMPTY_BILL" | "UNKNOWN_ITEM" | "INVALID_RATIO" | "UNASSIGNED_ITEM";
    } => {
  if (allocations.some((allocation) => allocation.itemShares.length === 0))
    return { ok: false, reason: "EMPTY_BILL" };
  const active = new Set(activeItemIds);
  const totals = new Map<string, number>();
  for (const allocation of allocations) {
    for (const share of allocation.itemShares) {
      if (!active.has(share.orderItemId))
        return { ok: false, reason: "UNKNOWN_ITEM" };
      if (
        !Number.isFinite(share.shareRatio) ||
        share.shareRatio <= 0 ||
        share.shareRatio > 1
      )
        return { ok: false, reason: "INVALID_RATIO" };
      totals.set(
        share.orderItemId,
        (totals.get(share.orderItemId) ?? 0) + share.shareRatio,
      );
    }
  }
  for (const id of active) {
    if (Math.abs((totals.get(id) ?? 0) - 1) > 0.000001)
      return { ok: false, reason: "UNASSIGNED_ITEM" };
  }
  return { ok: true };
};

export const validateFractionalComboAllocations = (
  items: BillableOrderItem[],
  allocations: ItemShareAllocation[],
): { ok: true } | { ok: false; reason: "SPLIT_COMBO_GROUP" } => {
  const sharesByItem = new Map<string, Map<number, number>>();
  allocations.forEach((allocation, billIndex) => {
    for (const share of allocation.itemShares) {
      const byBill =
        sharesByItem.get(share.orderItemId) ?? new Map<number, number>();
      byBill.set(billIndex, share.shareRatio);
      sharesByItem.set(share.orderItemId, byBill);
    }
  });
  for (const group of buildBillableItemGroups(items)) {
    if (group.length < 2) continue;
    const baseline = sharesByItem.get(group[0]!) ?? new Map();
    for (const id of group.slice(1)) {
      const current = sharesByItem.get(id) ?? new Map();
      const bills = new Set([...baseline.keys(), ...current.keys()]);
      for (const bill of bills) {
        if (
          Math.abs((baseline.get(bill) ?? 0) - (current.get(bill) ?? 0)) >
          0.000001
        ) {
          return { ok: false, reason: "SPLIT_COMBO_GROUP" };
        }
      }
    }
  }
  return { ok: true };
};

export function buildBillableItemGroups(
  items: BillableOrderItem[],
): string[][] {
  const grouped = new Map<string, string[]>();
  for (const item of items) {
    const key = item.comboGroupId
      ? `combo:${item.comboGroupId}`
      : `item:${item.id}`;
    grouped.set(key, [...(grouped.get(key) ?? []), item.id]);
  }
  return [...grouped.values()];
}

export const groupOrderItemsForEvenBills = (
  items: BillableOrderItem[],
  ways: number,
): string[][] | null => {
  if (!Number.isInteger(ways) || ways < 1)
    throw new ValidationError("Split count must be a positive integer", {
      reason: "INVALID_SPLIT_COUNT",
    });
  const groups = buildBillableItemGroups(items);
  if (groups.length < ways) return null;
  const bills = Array.from({ length: ways }, () => [] as string[]);
  groups.forEach((group, index) => bills[index % ways]!.push(...group));
  return bills;
};

export const validateComboGroupAllocations = (
  items: BillableOrderItem[],
  allocations: ItemAllocation[],
): { ok: true } | { ok: false; reason: "SPLIT_COMBO_GROUP" } => {
  const billByItem = new Map<string, number>();
  allocations.forEach((allocation, billIndex) => {
    allocation.orderItemIds.forEach((id) => billByItem.set(id, billIndex));
  });

  for (const group of buildBillableItemGroups(items)) {
    if (group.length < 2) continue;
    const assignedBills = new Set(
      group
        .map((id) => billByItem.get(id))
        .filter((value): value is number => value !== undefined),
    );
    if (assignedBills.size > 1)
      return { ok: false, reason: "SPLIT_COMBO_GROUP" };
  }
  return { ok: true };
};

export const validateItemAllocations = (
  activeItemIds: string[],
  allocations: ItemAllocation[],
):
  | { ok: true }
  | {
      ok: false;
      reason:
        "EMPTY_BILL" | "UNKNOWN_ITEM" | "DUPLICATE_ITEM" | "UNASSIGNED_ITEM";
    } => {
  if (allocations.some((allocation) => allocation.orderItemIds.length === 0)) {
    return { ok: false, reason: "EMPTY_BILL" };
  }
  const active = new Set(activeItemIds);
  const assigned = new Set<string>();
  for (const allocation of allocations) {
    for (const itemId of allocation.orderItemIds) {
      if (!active.has(itemId)) return { ok: false, reason: "UNKNOWN_ITEM" };
      if (assigned.has(itemId)) return { ok: false, reason: "DUPLICATE_ITEM" };
      assigned.add(itemId);
    }
  }
  if (assigned.size !== active.size)
    return { ok: false, reason: "UNASSIGNED_ITEM" };
  return { ok: true };
};

export const allocateTotalsByWeight = (
  total: number,
  weights: number[],
): number[] => {
  const sign = total < 0 ? -1 : 1;
  const totalCents = Math.abs(Math.round(total * 100));
  const weightTotal = weights.reduce(
    (sum, weight) => sum + Math.max(0, weight),
    0,
  );
  if (weightTotal <= 0) return splitMoneyEvenly(total, weights.length);
  const raw = weights.map(
    (weight) => (totalCents * Math.max(0, weight)) / weightTotal,
  );
  const cents = raw.map(Math.floor);
  let remainder = totalCents - cents.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let index = 0; index < remainder; index += 1) {
    cents[order[index % order.length]!.index]! += 1;
  }
  return cents.map((value) => {
    const signed = sign * value;
    return signed === 0 ? 0 : signed / 100;
  });
};
