import { useMemo, useState } from "react";
import { QueryErrorState, StaleDataBanner, toast } from "@pos/ui";
import { extractApiError } from "@/shared/lib/api-client";
import {
  buildComboPayload,
  mapComboApiFieldErrors,
  validateComboDraft,
  type ComboPolicy,
  type DraftOption,
  type DraftSlot,
} from "@/features/menu/helpers/combo-form";
import { useMenuCategories } from "@/features/menu";
import { useFormValidationVisibility } from "@/shared/hooks/useFormValidationVisibility";
import { ComboEditor } from "./ComboEditor";
import { ComboList } from "./ComboList";
import type { ComboSummary } from "./combo-types";
import {
  useCombos,
  useDeleteCombo,
  useSaveCombo,
} from "@/features/menu/hooks/useCombos";
const newKey = () => crypto.randomUUID();
const newOption = (): DraftOption => ({
  key: newKey(),
  menuItemId: "",
  variantId: "",
  upcharge: "0",
  isUnlimitedRefill: false,
});
const newSlot = (name = "Choice 1"): DraftSlot => ({
  key: newKey(),
  name,
  minSelections: "1",
  maxSelections: "1",
  options: [newOption()],
});

export const CombosSection = () => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [policy, setPolicy] = useState<ComboPolicy>("FIXED");
  const [amount, setAmount] = useState("0");
  const [slots, setSlots] = useState<DraftSlot[]>([newSlot()]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formErrorMessages, setFormErrorMessages] = useState<string[]>([]);
  const [editingInitialPayload, setEditingInitialPayload] = useState<
    string | null
  >(null);
  const validationVisibility = useFormValidationVisibility();
  const categoriesQuery = useMenuCategories();
  const categories = categoriesQuery.data ?? [];

  const itemChoices = useMemo(
    () =>
      categories.flatMap((category) =>
        (category.menuItems ?? [])
          .filter((item) => item.isPublished && item.status !== "DISCONTINUED")
          .map((item) => ({
            id: item.id,
            label: `${item.name} · ${category.name}`,
            variants: item.variants ?? [],
          })),
      ),
    [categories],
  );

  const combosQuery = useCombos();
  const combos = combosQuery.data;

  const reset = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setPolicy("FIXED");
    setAmount("0");
    setSlots([newSlot()]);
    setFieldErrors({});
    setFormErrorMessages([]);
    validationVisibility.resetVisibility();
    setEditingInitialPayload(null);
  };

  const draft = useMemo(
    () => ({ name, description, policy, amount, slots }),
    [amount, description, name, policy, slots],
  );
  const payload = useMemo(() => buildComboPayload(draft), [draft]);
  const clientErrors = useMemo(() => validateComboDraft(draft), [draft]);
  const valid = Object.keys(clientErrors).length === 0;
  const isDirty = editingId
    ? JSON.stringify(payload) !== editingInitialPayload
    : true;
  const dependencyUnavailable =
    categoriesQuery.isError && !categoriesQuery.data;
  const visibleError = (key: string) =>
    fieldErrors[key] ??
    validationVisibility.clientError(key, clientErrors[key]);
  const clearFieldError = (key: string) => {
    setFieldErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const save = useSaveCombo();
  const remove = useDeleteCombo();

  const beginEdit = (combo: ComboSummary) => {
    const editAmount = String(
      combo.pricePolicy === "FIXED"
        ? (combo.fixedPrice ?? 0)
        : (combo.percentOff ?? 0),
    );
    const editSlots = combo.slots.map((slot) => ({
      key: slot.id ?? newKey(),
      name: slot.name,
      minSelections: String(slot.minSelections),
      maxSelections: String(slot.maxSelections),
      options: slot.options.map((option) => ({
        key: option.id ?? newKey(),
        menuItemId: option.menuItemId,
        variantId: option.variantId ?? "",
        upcharge: String(option.upcharge ?? 0),
        isUnlimitedRefill: option.isUnlimitedRefill ?? false,
      })),
    }));
    setEditingId(combo.id);
    setName(combo.name);
    setDescription(combo.description ?? "");
    setPolicy(combo.pricePolicy);
    setAmount(editAmount);
    setSlots(editSlots);
    setFieldErrors({});
    setFormErrorMessages([]);
    validationVisibility.resetVisibility();
    setEditingInitialPayload(
      JSON.stringify(
        buildComboPayload({
          name: combo.name,
          description: combo.description ?? "",
          policy: combo.pricePolicy,
          amount: editAmount,
          slots: editSlots,
        }),
      ),
    );
    document
      .getElementById("combo-editor")
      ?.scrollIntoView?.({ behavior: "smooth" });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-semibold">Combos / set meals</h2>
        <p className="text-sm text-text-secondary">
          Build a combo from normal menu items. Add multiple choices to a slot
          when the guest may choose between alternatives.
        </p>
      </div>

      {combosQuery.isError && !combos ? (
        <QueryErrorState
          title="Unable to load combos"
          description="Combos could not be loaded. Retry before creating or editing combo definitions."
          onRetry={() => void combosQuery.refetch()}
          isRetrying={combosQuery.isFetching}
        />
      ) : null}
      {combosQuery.isError && combos ? (
        <StaleDataBanner
          message="Combo refresh failed — showing the last available combo data."
          onRetry={() => void combosQuery.refetch()}
          isRetrying={combosQuery.isFetching}
        />
      ) : null}
      {categoriesQuery.isError && categoriesQuery.data ? (
        <StaleDataBanner
          message="Menu item refresh failed — combo choices may be stale."
          onRetry={() => void categoriesQuery.refetch()}
          isRetrying={categoriesQuery.isFetching}
        />
      ) : null}
      {dependencyUnavailable ? (
        <QueryErrorState
          title="Unable to load menu items"
          description="Menu items are required to build combos. Retry before saving changes."
          onRetry={() => void categoriesQuery.refetch()}
          isRetrying={categoriesQuery.isFetching}
        />
      ) : null}

      <ComboEditor
        editing={Boolean(editingId)}
        name={name}
        description={description}
        policy={policy}
        amount={amount}
        slots={slots}
        itemChoices={itemChoices}
        formErrorMessages={formErrorMessages}
        visibleError={visibleError}
        touchField={validationVisibility.touchField}
        clearFieldError={clearFieldError}
        setName={setName}
        setDescription={setDescription}
        setPolicy={setPolicy}
        setAmount={setAmount}
        updateSlots={setSlots}
        addSlot={() =>
          setSlots((current) => [
            ...current,
            newSlot(`Choice ${current.length + 1}`),
          ])
        }
        newOption={newOption}
        valid={valid}
        isDirty={isDirty}
        isSaving={save.isPending}
        dependencyUnavailable={dependencyUnavailable}
        combosUnavailable={combosQuery.isError}
        onSubmit={() => {
          validationVisibility.markSubmitted();
          setFieldErrors({});
          setFormErrorMessages([]);
          if (valid) {
            save.mutate(
              { ...(editingId ? { id: editingId } : {}), input: payload },
              {
                onSuccess: () => {
                  toast({
                    title: editingId ? "Combo updated" : "Combo created",
                    tone: "success",
                  });
                  reset();
                },
                onError: (error) => {
                  const mapped = mapComboApiFieldErrors(error, slots);
                  setFieldErrors(mapped.fieldErrors);
                  setFormErrorMessages(
                    mapped.formMessages.length
                      ? mapped.formMessages
                      : Object.keys(mapped.fieldErrors).length
                        ? []
                        : [extractApiError(error, "Failed to save combo")],
                  );
                },
              },
            );
          }
        }}
        onCancel={reset}
      />

      <ComboList
        combos={combos}
        deletingId={remove.isPending ? remove.variables : undefined}
        onEdit={beginEdit}
        onDelete={(combo) => {
          if (confirm(`Delete combo "${combo.name}"?`)) {
            remove.mutate(combo.id, {
              onSuccess: () => {
                toast({ title: "Combo deleted", tone: "success" });
                if (editingId === combo.id) reset();
              },
              onError: (error) =>
                toast({ title: extractApiError(error), tone: "danger" }),
            });
          }
        }}
      />
    </div>
  );
};
