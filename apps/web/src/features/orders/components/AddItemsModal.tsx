import { useState } from "react";
import { Plus, Minus, Trash2 } from "lucide-react";
import { Button, Modal, Select } from "@pos/ui";
import { formatCurrency } from "@/shared/utils/format";
import { useMenuCategories } from "@/features/menu";
import { useAddOrderItems } from "@/features/orders";
import { toCartItemPayload } from "@/features/orders/services/orders.service";
import { ItemCustomizerModal } from "./ItemCustomizerModal";
import { cartItemKey, type CartItem } from "@/features/orders/utils/cartTypes";
import type { FoodType, MenuCategory, MenuItem } from "@pos/types";
import { addOrderItemsSchema } from "@pos/validation";
import { useCourseSequencingEnabled } from "@/features/orders/hooks/useCourseSequencingEnabled";

const FOOD_TYPE_FILTERS: { value: FoodType | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "VEG", label: "Veg" },
  { value: "NON_VEG", label: "Non-Veg" },
  { value: "EGG", label: "Egg" },
];

const itemPriceLabel = (item: MenuItem): string => {
  if (!item.variants?.length) return formatCurrency(Number(item.basePrice));
  const prices = item.variants.map((v) => Number(v.price));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max
    ? formatCurrency(min)
    : `${formatCurrency(min)} – ${formatCurrency(max)}`;
};

export const AddItemsModal = ({
  orderId,
  onClose,
}: {
  orderId: string;
  onClose: () => void;
}) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [foodTypeFilter, setFoodTypeFilter] = useState<FoodType | "ALL">("ALL");
  const [customising, setCustomising] = useState<{ item: MenuItem } | null>(
    null,
  );
  const [validationError, setValidationError] = useState("");
  const [assignCourse, setAssignCourse] = useState(false);
  const [roundCourseNumber, setRoundCourseNumber] = useState(1);
  const courseSequencingAvailable = useCourseSequencingEnabled();

  const { data: categories } = useMenuCategories();

  const addItemsMutation = useAddOrderItems(orderId);

  function handleItemClick(menuItem: MenuItem) {
    const hasOptions =
      menuItem.variants?.length > 0 ||
      (menuItem.modifierGroupLinks?.length ?? 0) > 0;
    if (hasOptions) {
      setCustomising({ item: menuItem });
      return;
    }
    addOrIncrementItem({
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      basePrice: Number(menuItem.basePrice),
      modifiers: [],
      chefNotes: "",
      seatLabel: "",
      quantity: 1,
      unitPrice: Number(menuItem.basePrice),
    });
  }

  function addOrIncrementItem(newItem: CartItem) {
    setItems((prev) => {
      const key = cartItemKey(newItem);
      const existing = prev.find((i) => cartItemKey(i) === key);
      if (existing) {
        return prev.map((i) =>
          cartItemKey(i) === key
            ? { ...i, quantity: i.quantity + newItem.quantity }
            : i,
        );
      }
      return [...prev, newItem];
    });
  }

  function updateQty(key: string, delta: number) {
    setItems((prev) =>
      prev
        .map((i) =>
          cartItemKey(i) === key ? { ...i, quantity: i.quantity + delta } : i,
        )
        .filter((i) => i.quantity > 0),
    );
  }

  const total = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const allItems: MenuItem[] =
    categories?.flatMap((c: MenuCategory) => c.menuItems ?? []) ?? [];
  const visibleCategories = categories?.map((cat: MenuCategory) => ({
    ...cat,
    menuItems: (cat.menuItems ?? []).filter(
      (it) => foodTypeFilter === "ALL" || it.foodType === foodTypeFilter,
    ),
  }));

  function handleSubmit() {
    const parsed = addOrderItemsSchema.safeParse({
      ...(notes && { notes }),
      items: items.map((item) => ({
        ...toCartItemPayload(item),
        ...(assignCourse ? { courseNumber: roundCourseNumber } : {}),
      })),
    });
    if (!parsed.success) {
      setValidationError(
        parsed.error.issues[0]?.message ?? "Please review the items.",
      );
      return;
    }
    setValidationError("");

    const payload = {
      ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
      items: (parsed.data.items ?? []).map((item) => ({
        ...item,
        ...(item.variantId !== undefined && { variantId: item.variantId }),
        ...(item.chefNotes !== undefined && { chefNotes: item.chefNotes }),
        ...(item.seatLabel && { seatLabel: item.seatLabel }),
        selectedOptions: (item.selectedOptions ?? []).map((option) => ({
          optionId: option.optionId,
          quantity: option.quantity ?? 1,
        })),
      })),
    };
    addItemsMutation.mutate(payload, { onSuccess: onClose });
  }

  return (
    <Modal open title="Add Items to Order" onClose={onClose} size="xl">
      <p className="text-xs text-text-disabled -mt-2 mb-4">
        These items will be fired to the kitchen as a new round.
      </p>
      {courseSequencingAvailable && (
        <div className="mb-4 flex items-center gap-3 rounded-md border border-border bg-surface-secondary px-3 py-2 text-sm">
          <label className="flex items-center gap-2 text-text-secondary">
            <input
              type="checkbox"
              checked={assignCourse}
              onChange={(event) => setAssignCourse(event.target.checked)}
            />{" "}
            Assign this round to a course
          </label>
          {assignCourse && (
            <Select
              aria-label="Course"
              value={String(roundCourseNumber)}
              onChange={(value) => setRoundCourseNumber(Number(value))}
              options={[1, 2, 3, 4, 5].map((course) => ({
                value: String(course),
                label: `Course ${course}`,
              }))}
              containerClassName="min-w-32"
              className="py-1"
            />
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            {FOOD_TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFoodTypeFilter(f.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  foodTypeFilter === f.value
                    ? "border-primary bg-primary-surface text-primary"
                    : "border-border text-text-secondary"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
            {!allItems.length && (
              <p className="text-sm text-text-disabled text-center py-6">
                No menu items yet.
              </p>
            )}
            {visibleCategories?.map((cat) =>
              cat.menuItems?.length ? (
                <div key={cat.id}>
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                    {cat.name}
                  </p>
                  <div className="space-y-1">
                    {cat.menuItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-md text-left hover:bg-primary-surface transition-colors group"
                      >
                        <span className="text-sm text-text-primary group-hover:text-primary-hover">
                          {item.name}
                          {(item.variants?.length > 0 ||
                            (item.modifierGroupLinks?.length ?? 0) > 0) && (
                            <span className="text-xs text-text-disabled ml-1.5">
                              Options ▾
                            </span>
                          )}
                        </span>
                        <span className="text-sm font-semibold text-text-primary">
                          {itemPriceLabel(item)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null,
            )}
          </div>
        </div>

        <div className="flex flex-col">
          <p className="text-sm font-semibold text-text-primary mb-3">
            New Items ({items.length})
          </p>

          {!items.length ? (
            <div className="flex-1 flex items-center justify-center text-text-disabled text-sm border-2 border-dashed border-border rounded-lg">
              Click menu items to add
            </div>
          ) : (
            <div className="flex-1 space-y-2 overflow-y-auto max-h-64 pr-1">
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
                      {item.chefNotes && (
                        <span className="text-xs text-primary block">
                          📝 {item.chefNotes}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => updateQty(key, -1)}
                        aria-label={`Decrease quantity of ${item.menuItemName}`}
                        className="w-6 h-6 flex items-center justify-center rounded text-text-secondary hover:bg-surface-secondary"
                      >
                        <Minus className="w-3 h-3" aria-hidden="true" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQty(key, 1)}
                        aria-label={`Increase quantity of ${item.menuItemName}`}
                        className="w-6 h-6 flex items-center justify-center rounded text-text-secondary hover:bg-surface-secondary"
                      >
                        <Plus className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-text-primary w-16 text-right flex-shrink-0">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </span>
                    <button
                      onClick={() => updateQty(key, -item.quantity)}
                      aria-label={`Remove ${item.menuItemName} from order`}
                      className="text-text-disabled hover:text-danger flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-divider">
            <input
              type="text"
              placeholder="Notes for this round…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              aria-label="Notes for this round"
              className="w-full mb-3 px-3 py-2 text-sm border border-border rounded-md bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-text-secondary">
                New items total
              </span>
              <span className="text-xl font-bold text-text-primary">
                {formatCurrency(total)}
              </span>
            </div>
            {validationError && (
              <p className="text-xs text-danger text-center mb-2">
                {validationError}
              </p>
            )}
            <Button
              className="w-full"
              onClick={handleSubmit}
              loading={addItemsMutation.isPending}
              disabled={!items.length}
            >
              Add to Order
            </Button>
          </div>
        </div>
      </div>

      {customising && (
        <ItemCustomizerModal
          item={customising.item}
          onConfirm={addOrIncrementItem}
          onClose={() => setCustomising(null)}
        />
      )}
    </Modal>
  );
};
