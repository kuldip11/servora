import type { Bill } from "@pos/types";

type BillAssignment = NonNullable<Bill["itemAssignments"]>[number];

export const BillItemSummary = ({
  assignments,
}: {
  assignments: BillAssignment[];
}) => {
  const rendered = new Set<string>();
  const rows: React.ReactNode[] = [];

  for (const assignment of assignments) {
    const item = assignment.orderItem;
    const comboGroupId = item?.comboGroupId ?? null;
    if (comboGroupId) {
      if (rendered.has(`combo:${comboGroupId}`)) continue;
      rendered.add(`combo:${comboGroupId}`);
      const group = assignments.filter(
        (candidate) => candidate.orderItem?.comboGroupId === comboGroupId,
      );
      const parent = group.find(
        (candidate) => candidate.orderItem?.menuItemId == null,
      );
      const children = group.filter(
        (candidate) => candidate.orderItem?.menuItemId != null,
      );
      rows.push(
        <div
          key={`combo:${comboGroupId}`}
          className="rounded-md bg-surface-secondary px-2 py-1.5"
        >
          <p className="text-sm font-medium text-text-primary">
            {parent?.orderItem?.quantity ?? 1}×{" "}
            {parent?.orderItem?.menuItemName ?? "Combo"}
          </p>
          {children.length > 0 && (
            <div className="mt-1 space-y-0.5 border-l border-divider pl-2">
              {children.map((child) => (
                <p
                  key={child.orderItemId}
                  className="text-xs text-text-secondary"
                >
                  {child.orderItem?.quantity ?? 1}×{" "}
                  {child.orderItem?.menuItemName ?? "Item"}
                </p>
              ))}
            </div>
          )}
        </div>,
      );
      continue;
    }

    rows.push(
      <p key={assignment.orderItemId} className="text-sm text-text-primary">
        {item?.quantity ?? 1}× {item?.menuItemName ?? "Item"}
      </p>,
    );
  }

  return <div className="space-y-1.5">{rows}</div>;
};
