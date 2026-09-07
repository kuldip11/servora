import { Modal, StatusBadge } from "@pos/ui";
import type { InventoryItem } from "@pos/types";
import { useInventoryRecipeImpact } from "@/features/inventory/hooks/useInventoryRecipeImpact";

export const InventoryImpactDialog = ({
  item,
  onClose,
}: {
  item: InventoryItem | null;
  onClose: () => void;
}) => {
  const { data, isLoading } = useInventoryRecipeImpact(item?.id);
  if (!item) return null;
  return (
    <Modal
      open
      onClose={onClose}
      title={`Recipe impact: ${item.name}`}
      size="sm"
    >
      {isLoading ? (
        <p className="py-6 text-center text-sm text-text-secondary">
          Loading recipe impact…
        </p>
      ) : !data?.impacts.length ? (
        <p className="py-6 text-center text-sm text-text-secondary">
          This ingredient is not currently a required auto-deduction input for
          any menu item, variant, or modifier.
        </p>
      ) : (
        <div className="space-y-2">
          {data.impacts.map((impact) => (
            <div
              key={`${impact.kind}:${impact.entityId}`}
              className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-primary">
                  {impact.kind === "ITEM"
                    ? impact.entityName
                    : `${impact.menuItemName} · ${impact.entityName}`}
                </p>
                <p className="text-xs text-text-secondary">
                  {impact.kind === "ITEM"
                    ? "Base item"
                    : impact.kind === "VARIANT"
                      ? "Variant"
                      : "Modifier option"}
                </p>
              </div>
              <StatusBadge
                tone={impact.computedAvailable ? "success" : "danger"}
                label={impact.computedAvailable ? "Available" : "Auto 86"}
              />
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};
