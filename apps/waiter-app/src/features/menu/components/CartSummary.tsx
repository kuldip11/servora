import { Send, Layers, Minus, Pencil, Plus } from "lucide-react";
import { BottomSheet, Button, Select, TextInput } from "@pos/ui";
import type { CartItem } from "@/features/menu/types";
import { COURSE_LABELS } from "@/features/menu/constants";
import { cartItemKey } from "@/features/menu/utils/cart";
import type {
  WaiterComboCartLine,
  WaiterComboMenuItem,
} from "@/features/menu/combo";
import { comboLineKey, estimateComboSubtotal } from "@/features/menu/combo";

interface Props {
  cart: CartItem[];
  combos: WaiterComboCartLine[];
  menuById: Map<string, WaiterComboMenuItem>;
  isAddingToExisting: boolean;
  courseSequencingAvailable: boolean;
  courseMode: boolean;
  onCourseModeChange: (enabled: boolean) => void;
  roundCourseNumber: number;
  onRoundCourseNumberChange: (course: number) => void;
  onUpdateCourse: (key: string, course: number) => void;
  onUpdateComboCourse: (key: string, course: number) => void;
  orderNotes: string;
  onOrderNotesChange: (value: string) => void;
  couponCode: string;
  onCouponCodeChange: (value: string) => void;
  promotions: Array<{ id: string; name: string }>;
  selectedPromotionIds: string[];
  onTogglePromotion: (id: string) => void;
  totalItems: number;
  totalPrice: number;
  isPending: boolean;
  needsTable: boolean;
  onUpdateQty: (key: string, delta: number) => void;
  onUpdateComboQty: (key: string, delta: number) => void;
  onEditItem?: (key: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

import { COURSE_OPTIONS } from "@/features/menu/constants";
const courseLabel = (course: number) => {
  return (
    COURSE_LABELS[course as keyof typeof COURSE_LABELS] ?? `Course ${course}`
  );
};

export const CartSummary = ({
  cart,
  combos,
  menuById,
  isAddingToExisting,
  courseSequencingAvailable,
  courseMode,
  onCourseModeChange,
  roundCourseNumber,
  onRoundCourseNumberChange,
  onUpdateCourse,
  onUpdateComboCourse,
  orderNotes,
  onOrderNotesChange,
  couponCode,
  onCouponCodeChange,
  promotions,
  selectedPromotionIds,
  onTogglePromotion,
  totalItems,
  totalPrice,
  isPending,
  needsTable,
  onUpdateQty,
  onUpdateComboQty,
  onEditItem,
  onSubmit,
  onClose,
}: Props) => {
  const sections =
    courseMode && !isAddingToExisting
      ? [...new Set(cart.map((item) => item.course ?? 1))]
          .sort((a, b) => a - b)
          .map((course) => ({
            course,
            items: cart.filter((item) => (item.course ?? 1) === course),
          }))
      : [{ course: null, items: cart }];

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={isAddingToExisting ? "Adding to Order" : "Cart"}
      footer={
        <div className="w-full space-y-3">
          <TextInput
            placeholder={
              isAddingToExisting ? "Notes for this round…" : "Order notes…"
            }
            value={orderNotes}
            onChange={(e) => onOrderNotesChange(e.target.value)}
            className="rounded-2xl bg-surface-secondary"
          />
          <TextInput
            placeholder="Coupon code (optional)"
            value={couponCode}
            onChange={(e) => onCouponCodeChange(e.target.value.toUpperCase())}
            className="rounded-2xl bg-surface-secondary"
          />
          {promotions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {promotions.map((promotion) => {
                const selected = selectedPromotionIds.includes(promotion.id);
                return (
                  <button
                    key={promotion.id}
                    type="button"
                    onClick={() => onTogglePromotion(promotion.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${selected ? "border-primary bg-primary-surface text-primary" : "border-border text-text-secondary"}`}
                  >
                    {promotion.name}
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-text-secondary">
              Total ({totalItems} items)
            </span>
            <span className="text-xl font-bold text-text-primary">
              ₹{totalPrice.toFixed(2)}
            </span>
          </div>
          <Button
            onClick={onSubmit}
            disabled={needsTable}
            loading={isPending}
            className="w-full rounded-2xl py-4"
          >
            <Send className="w-4 h-4" />
            {isPending
              ? "Placing…"
              : isAddingToExisting
                ? "Add to Order"
                : "Place Order"}
          </Button>
          {needsTable && (
            <p className="text-xs text-danger text-center -mt-1">
              Select a table to place a dine-in order.
            </p>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {courseSequencingAvailable && (
          <div className="rounded-xl border border-border bg-surface-secondary p-3">
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={courseMode}
                onChange={(event) => onCourseModeChange(event.target.checked)}
              />
              <span>
                <strong className="text-text-primary">Course mode</strong> —
                later courses wait until the prior course is served.
              </span>
            </label>
            {courseMode && isAddingToExisting && (
              <div className="mt-3">
                <Select
                  label="This round"
                  value={String(roundCourseNumber)}
                  onChange={(value) => onRoundCourseNumberChange(Number(value))}
                  className="rounded-xl"
                  options={COURSE_OPTIONS.map((course) => ({
                    value: String(course),
                    label: courseLabel(course),
                  }))}
                />
              </div>
            )}
          </div>
        )}

        {combos.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-3.5 h-3.5 text-text-disabled" />
              <p className="text-xs font-semibold text-text-disabled uppercase tracking-wide">
                Combos
              </p>
            </div>
            {combos.map((line) => {
              const key = comboLineKey(line);
              return (
                <div key={key} className="flex items-start gap-3 py-2">
                  <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                    <button
                      onClick={() => onUpdateComboQty(key, -1)}
                      aria-label={`Decrease quantity of ${line.combo.name}`}
                      className="w-7 h-7 flex items-center justify-center bg-surface-secondary rounded-full"
                    >
                      <Minus className="w-3.5 h-3.5 text-text-secondary" />
                    </button>
                    <span className="text-sm font-bold w-5 text-center">
                      {line.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateComboQty(key, 1)}
                      aria-label={`Increase quantity of ${line.combo.name}`}
                      className="w-7 h-7 flex items-center justify-center bg-primary-surface rounded-full"
                    >
                      <Plus className="w-3.5 h-3.5 text-primary" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary">
                      {line.combo.name}
                    </p>
                    <p className="text-xs text-text-disabled">
                      {line.selections.reduce(
                        (sum, value) => sum + value.optionIds.length,
                        0,
                      )}{" "}
                      selections · estimated
                    </p>
                    {courseMode && !isAddingToExisting && (
                      <Select
                        aria-label={`Course for ${line.combo.name}`}
                        className="mt-1 min-h-9 rounded-lg py-1 text-xs"
                        value={String(line.courseNumber ?? 1)}
                        onChange={(value) =>
                          onUpdateComboCourse(key, Number(value))
                        }
                        options={COURSE_OPTIONS.map((course) => ({
                          value: String(course),
                          label: courseLabel(course),
                        }))}
                      />
                    )}
                  </div>
                  <p className="text-sm font-semibold text-text-primary">
                    ₹{estimateComboSubtotal(line, menuById).toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {sections.map((section) => (
          <div key={section.course ?? "items"}>
            {section.course !== null && (
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-3.5 h-3.5 text-text-disabled" />
                <p className="text-xs font-semibold text-text-disabled uppercase tracking-wide">
                  {courseLabel(section.course)}
                </p>
              </div>
            )}
            {section.items.map((item) => {
              const key = cartItemKey(item);
              return (
                <div key={key} className="flex items-start gap-3 py-2">
                  <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                    <button
                      onClick={() => onUpdateQty(key, -1)}
                      aria-label={`Decrease quantity of ${item.name}`}
                      className="w-7 h-7 flex items-center justify-center bg-surface-secondary rounded-full"
                    >
                      <Minus className="w-3.5 h-3.5 text-text-secondary" />
                    </button>
                    <span className="text-sm font-bold w-5 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQty(key, 1)}
                      aria-label={`Increase quantity of ${item.name}`}
                      className="w-7 h-7 flex items-center justify-center bg-primary-surface rounded-full"
                    >
                      <Plus className="w-3.5 h-3.5 text-primary" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary">
                      {item.name}
                    </p>
                    {item.variantName && (
                      <p className="text-xs text-text-secondary">
                        {item.variantName}
                      </p>
                    )}
                    {item.weightQuantity != null && (
                      <p className="text-xs text-text-secondary">
                        {item.weightQuantity} {item.weightUnit ?? ""}
                      </p>
                    )}
                    {item.manualPrice != null && (
                      <p className="text-xs text-text-secondary">
                        Manual price ₹{item.manualPrice.toFixed(2)}
                      </p>
                    )}
                    {item.modifiers.map((modifier) => (
                      <p
                        key={`${modifier.optionId}:${modifier.zoneLabel ?? "WHOLE"}`}
                        className="text-xs text-text-disabled"
                      >
                        +{" "}
                        {modifier.zoneLabel && modifier.zoneLabel !== "WHOLE"
                          ? `${modifier.zoneLabel}: `
                          : ""}
                        {modifier.name}
                        {modifier.quantity > 1 ? ` ×${modifier.quantity}` : ""}
                      </p>
                    ))}
                    {item.chefNotes && (
                      <p className="text-xs text-primary mt-0.5">
                        📝 {item.chefNotes}
                      </p>
                    )}
                    {onEditItem && (
                      <button
                        type="button"
                        onClick={() => onEditItem(key)}
                        className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary-surface px-3 text-xs font-semibold text-primary"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit choices
                      </button>
                    )}
                    {courseMode && !isAddingToExisting && (
                      <Select
                        aria-label={`Course for ${item.name}`}
                        className="mt-1 min-h-9 rounded-lg py-1 text-xs"
                        value={String(item.course ?? 1)}
                        onChange={(value) => onUpdateCourse(key, Number(value))}
                        options={COURSE_OPTIONS.map((course) => ({
                          value: String(course),
                          label: courseLabel(course),
                        }))}
                      />
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-text-primary">
                      ₹{(item.unitPrice * item.quantity).toFixed(2)}
                    </p>
                    <p className="text-xs text-text-disabled">
                      ₹{item.unitPrice.toFixed(2)} each
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </BottomSheet>
  );
};
