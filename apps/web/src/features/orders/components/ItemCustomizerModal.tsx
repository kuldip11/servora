import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button, Dialog, Select, TextInput } from "@pos/ui";
import { VariantSelector } from "@/features/orders/components/item-customizer/VariantSelector";
import { ModifierGroupsEditor } from "@/features/orders/components/item-customizer/ModifierGroupsEditor";
import { formatCurrency } from "@/shared/utils/format";
import type {
  CartItem,
  SelectedModifier,
} from "@/features/orders/utils/cartTypes";
import type { MenuItem, ModifierGroup, ModifierOption } from "@pos/types";
import { itemCustomizationSchema } from "@pos/validation";

interface Props {
  item: MenuItem;
  existingCartItem?: CartItem;
  onConfirm: (item: CartItem) => void;
  courseMode?: boolean;
  onClose: () => void;
}

export const ItemCustomizerModal = ({
  item,
  existingCartItem,
  onConfirm,
  onClose,
  courseMode = false,
}: Props) => {
  const hasVariants = item.variants?.length > 0;
  const groups: ModifierGroup[] = (item.modifierGroupLinks ?? []).map(
    (link) => link.group,
  );

  const [variantId, setVariantId] = useState(
    existingCartItem?.variantId ??
      (hasVariants ? (item.variants?.[0]?.id ?? "") : ""),
  );
  const [selections, setSelections] = useState<
    Record<string, SelectedModifier[]>
  >(() => {
    const initial: Record<string, SelectedModifier[]> = {};
    for (const mod of existingCartItem?.modifiers ?? []) {
      (initial[mod.groupId] ??= []).push(mod);
    }
    return initial;
  });
  const [chefNotes, setChefNotes] = useState(existingCartItem?.chefNotes ?? "");
  const [seatLabel, setSeatLabel] = useState(existingCartItem?.seatLabel ?? "");
  const [quantity, setQuantity] = useState(existingCartItem?.quantity ?? 1);
  const [courseNumber, setCourseNumber] = useState(
    existingCartItem?.courseNumber ?? 1,
  );
  const [validationError, setValidationError] = useState("");

  const basePrice = Number(item.basePrice);
  const selectedVariant = item.variants?.find((v) => v.id === variantId);

  const priceBeforeModifiers = selectedVariant
    ? Number(selectedVariant.price)
    : basePrice;
  const allSelectedModifiers = Object.values(selections).flat();
  const modifiersPrice = allSelectedModifiers.reduce(
    (s, m) => s + m.price * m.quantity,
    0,
  );
  const unitPrice = priceBeforeModifiers + modifiersPrice;

  function selectOption(group: ModifierGroup, option: ModifierOption) {
    setSelections((prev) => {
      const current = prev[group.id] ?? [];
      const already = current.find((m) => m.optionId === option.id);

      if (group.selectionType === "SINGLE") {
        if (already) return { ...prev, [group.id]: [] };
        return {
          ...prev,
          [group.id]: [
            {
              optionId: option.id,
              groupId: group.id,
              groupName: group.name,
              name: option.name,
              price: Number(option.additionalPrice),
              quantity: 1,
            },
          ],
        };
      }

      if (already) {
        return {
          ...prev,
          [group.id]: current.filter((m) => m.optionId !== option.id),
        };
      }
      if (
        group.maxSelections != null &&
        current.length >= group.maxSelections
      ) {
        return prev;
      }
      return {
        ...prev,
        [group.id]: [
          ...current,
          {
            optionId: option.id,
            groupId: group.id,
            groupName: group.name,
            name: option.name,
            price: Number(option.additionalPrice),
            quantity: 1,
          },
        ],
      };
    });
  }

  function setOptionQuantity(
    group: ModifierGroup,
    option: ModifierOption,
    qty: number,
  ) {
    setSelections((prev) => {
      const current = prev[group.id] ?? [];
      const clamped = Math.max(1, Math.min(qty, option.maxQuantity ?? 1));
      return {
        ...prev,
        [group.id]: current.map((m) =>
          m.optionId === option.id ? { ...m, quantity: clamped } : m,
        ),
      };
    });
  }

  const unmetGroup = groups.find(
    (g) => (selections[g.id]?.length ?? 0) < g.minSelections,
  );

  function handleConfirm() {
    if (unmetGroup) return;
    const parsed = itemCustomizationSchema.safeParse({
      menuItemId: item.id,
      ...(variantId && { variantId }),
      quantity,
      chefNotes,
      seatLabel,
      selectedOptions: allSelectedModifiers.map((m) => ({
        optionId: m.optionId,
        quantity: m.quantity,
      })),
    });
    if (!parsed.success) {
      setValidationError(
        parsed.error.issues[0]?.message ?? "Please review the item options.",
      );
      return;
    }
    setValidationError("");
    onConfirm({
      menuItemId: item.id,
      menuItemName: item.name,
      basePrice,
      ...(variantId && { variantId }),
      ...(selectedVariant?.name !== undefined && {
        variantName: selectedVariant.name,
      }),
      modifiers: allSelectedModifiers,
      chefNotes,
      seatLabel,
      quantity,
      ...(courseMode ? { courseNumber } : {}),
      unitPrice,
    });
    onClose();
  }

  return (
    <Dialog
      open
      title={item.name}
      onClose={onClose}
      size="md"
      footer={
        <div className="w-full">
          {validationError && (
            <p className="text-xs text-danger text-center mb-2">
              {validationError}
            </p>
          )}
          <Button
            onClick={handleConfirm}
            disabled={!!unmetGroup}
            className="w-full justify-between"
          >
            <span>{existingCartItem ? "Update Item" : "Add to Order"}</span>
            <span>{formatCurrency(unitPrice * quantity)}</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {courseMode && (
          <Select
            label="Course"
            value={String(courseNumber)}
            onChange={(value) => setCourseNumber(Number(value))}
            options={[1, 2, 3, 4, 5].map((course) => ({
              value: String(course),
              label: `Course ${course}`,
            }))}
          />
        )}
        <p className="text-sm text-primary font-semibold -mt-1">
          {formatCurrency(unitPrice)} × {quantity} ={" "}
          {formatCurrency(unitPrice * quantity)}
        </p>

        <div>
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
            Quantity
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-9 h-9 flex items-center justify-center bg-surface-secondary rounded-full"
            >
              <Minus className="w-4 h-4 text-text-primary" />
            </button>
            <span className="text-lg font-bold text-text-primary w-8 text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-9 h-9 flex items-center justify-center bg-primary rounded-full"
            >
              <Plus className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
        </div>

        {hasVariants ? (
          <VariantSelector
            variants={item.variants}
            selectedVariantId={variantId}
            onChange={setVariantId}
          />
        ) : null}

        <ModifierGroupsEditor
          groups={groups}
          selections={selections}
          onSelectOption={selectOption}
          onSetOptionQuantity={setOptionQuantity}
        />

        {(item.allergenLinks?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {(item.allergenLinks ?? []).map((l) => (
              <span
                key={l.allergenId}
                className="text-[11px] font-medium px-2 py-1 rounded-full border border-danger/20 bg-danger-surface text-danger"
              >
                ⚠ {l.allergen.name}
              </span>
            ))}
          </div>
        )}

        <TextInput
          label="Seat / diner (optional)"
          placeholder="e.g. Seat 1 or Priya"
          value={seatLabel}
          onChange={(e) => setSeatLabel(e.target.value)}
        />
        <TextInput
          label="Note for Chef"
          placeholder="e.g. no onion, extra spicy, gluten-free…"
          value={chefNotes}
          onChange={(e) => setChefNotes(e.target.value)}
        />

        {unmetGroup && (
          <p className="text-xs text-warning text-center">
            Choose {unmetGroup.minSelections} from "{unmetGroup.name}" to
            continue
          </p>
        )}
      </div>
    </Dialog>
  );
};
