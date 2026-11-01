import { Layers, Minus, Pencil, Plus } from "lucide-react";
import { Select } from "@pos/ui";
import { COURSE_LABELS, COURSE_OPTIONS } from "@/features/menu/constants";
import { cartItemKey } from "@/features/menu/utils/cart";
import { comboLineKey, estimateComboSubtotal } from "@/features/menu/combo";
import type { CartState, CartActions, LineCourses } from "./cart-summary.types";

export const courseLabel = (course: number) =>
  COURSE_LABELS[course as keyof typeof COURSE_LABELS] ?? `Course ${course}`;
export const CartLines = ({
  state,
  actions,
  lineCourses,
}: {
  state: CartState;
  actions: CartActions;
  lineCourses?: LineCourses | undefined;
}) => {
  const { items: cart, combos, menuById } = state;
  const {
    updateQty: onUpdateQty,
    updateComboQty: onUpdateComboQty,
    editItem: onEditItem,
  } = actions;
  const sections = lineCourses
    ? [...new Set(cart.map((item) => item.course ?? 1))]
        .sort((a, b) => a - b)
        .map((course) => ({
          course,
          items: cart.filter((item) => (item.course ?? 1) === course),
        }))
    : [{ course: null, items: cart }];

  return (
    <div className="space-y-4">
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
                  {lineCourses && (
                    <Select
                      aria-label={`Course for ${line.combo.name}`}
                      className="mt-1 min-h-9 rounded-lg py-1 text-xs"
                      value={String(line.courseNumber ?? 1)}
                      onChange={(value) =>
                        lineCourses.updateCombo(key, Number(value))
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
                  {lineCourses && (
                    <Select
                      aria-label={`Course for ${item.name}`}
                      className="mt-1 min-h-9 rounded-lg py-1 text-xs"
                      value={String(item.course ?? 1)}
                      onChange={(value) =>
                        lineCourses.updateItem(key, Number(value))
                      }
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
  );
};
