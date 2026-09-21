import { Plus, Minus, Trash2, Pencil } from "lucide-react";
import { Button, Select, TextArea } from "@pos/ui";
import { formatCurrency } from "@/shared/utils/format";
import { cartItemKey, type CartItem } from "@/features/orders/utils/cartTypes";
export const OrderCart = ({
  items,
  notes,
  total,
  pending,
  canSubmit,
  validationError,
  courseMode,
  onQty,
  onEdit,
  onCourse,
  onNotes,
  onSubmit,
}: {
  items: CartItem[];
  notes: string;
  total: number;
  pending: boolean;
  canSubmit: boolean;
  validationError?: string;
  courseMode: boolean;
  onQty: (key: string, delta: number) => void;
  onEdit: (item: CartItem) => void;
  onCourse: (key: string, courseNumber: number) => void;
  onNotes: (v: string) => void;
  onSubmit: () => void;
}) => {
  return (
    <div className="flex min-h-0 flex-col rounded-xl border border-border bg-surface p-4 lg:h-full">
      <p className="text-sm font-semibold text-text-primary mb-3">
        Order Items ({items.length})
      </p>
      {!items.length ? (
        <div className="flex-1 flex items-center justify-center text-text-disabled text-sm border-2 border-dashed border-border rounded-lg">
          Click menu items to add
        </div>
      ) : (
        <div className="max-h-64 flex-1 space-y-2 overflow-y-auto pr-1 lg:max-h-none">
          {items.map((item) => {
            const key = cartItemKey(item);
            return (
              <div
                key={key}
                className="flex items-start gap-2 bg-surface-secondary rounded-md p-2"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-text-primary truncate block">
                    {item.menuItemName}
                  </span>
                  {item.variantName && (
                    <span className="text-xs text-text-secondary">
                      {item.variantName}
                    </span>
                  )}
                  {item.modifiers.map((m) => (
                    <span
                      key={m.optionId}
                      className="text-xs text-text-disabled block"
                    >
                      + {m.name}
                      {m.quantity > 1 ? ` ×${m.quantity}` : ""}
                    </span>
                  ))}
                  {courseMode && (
                    <Select
                      aria-label={`Course for ${item.menuItemName}`}
                      value={String(item.courseNumber ?? 1)}
                      onChange={(value) => onCourse(key, Number(value))}
                      options={[1, 2, 3, 4, 5].map((course) => ({
                        value: String(course),
                        label: `Course ${course}`,
                      }))}
                      containerClassName="mt-1 w-28"
                      className="py-0.5 text-[11px]"
                    />
                  )}
                  {item.chefNotes && (
                    <span className="text-xs text-primary block">
                      📝 {item.chefNotes}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-surface"
                    aria-label={`Edit ${item.menuItemName}`}
                    title="Edit item"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onQty(key, -1)}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-surface"
                    aria-label={`Decrease ${item.menuItemName} quantity`}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onQty(key, 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-surface"
                    aria-label={`Increase ${item.menuItemName} quantity`}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-sm font-semibold text-text-primary w-16 text-right flex-shrink-0">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </span>
                <button
                  type="button"
                  onClick={() => onQty(key, -item.quantity)}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-text-disabled hover:bg-danger-surface hover:text-danger"
                  aria-label={`Remove ${item.menuItemName}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-4 pt-4 border-t border-divider">
        <TextArea
          placeholder="Order notes..."
          value={notes}
          onChange={(e) => onNotes(e.target.value)}
          rows={2}
          className="resize-none mb-3 text-sm"
        />
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-text-secondary">Total</span>
          <span className="text-xl font-bold text-text-primary">
            {formatCurrency(total)}
          </span>
        </div>
        <>
          {validationError && (
            <p className="text-xs text-danger text-center mb-2">
              {validationError}
            </p>
          )}
          <Button
            className="w-full"
            onClick={onSubmit}
            loading={pending}
            disabled={!canSubmit}
          >
            Place Order
          </Button>
        </>
      </div>
    </div>
  );
};
