import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  Button,
  FormErrorSummary,
  Input,
  QueryErrorState,
  Select,
  StaleDataBanner,
} from "@pos/ui";
import { MENU_ITEM_STATUS_OPTIONS } from "@/features/menu/constants";
import { useBranches } from "@/features/branches/hooks/useBranches";
import { useMenuItemBranchOverrides } from "@/features/menu/hooks/useMenuItemBranchOverrides";
import { useSaveBranchOverride } from "@/features/menu/hooks/useSaveBranchOverride";
import { useResetBranchOverride } from "@/features/menu/hooks/useResetBranchOverride";
import { useLocalFormApiErrors } from "@/shared/hooks/useLocalFormApiErrors";
import {
  type BranchOverrideDraft,
  validateBranchOverrideDraft,
} from "@/features/menu/helpers/branch-override-form";
import type { MenuItemBranchOverride } from "@pos/types";

interface Props {
  itemId: string;
  basePrice: number;
  baseTaxRate: number;
  basePrepTimeMinutes: number | null;
}

const toDraft = (
  override: MenuItemBranchOverride | undefined,
): BranchOverrideDraft => ({
  price: override?.price != null ? String(override.price) : "",
  taxRate: override?.taxRate != null ? String(override.taxRate) : "",
  prepTimeMinutes:
    override?.prepTimeMinutes != null ? String(override.prepTimeMinutes) : "",
  status: override?.status ?? "",
  isHidden: override?.isHidden ?? false,
  availabilityReason: override?.availabilityReason ?? "",
});

export const BranchOverridesPanel = ({
  itemId,
  basePrice,
  baseTaxRate,
  basePrepTimeMinutes,
}: Props) => {
  const branchesQuery = useBranches();
  const overridesQuery = useMenuItemBranchOverrides(itemId);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BranchOverrideDraft>(toDraft(undefined));
  const {
    fieldErrors,
    formErrorMessages,
    clearErrors,
    clearFieldError,
    handleApiError,
  } = useLocalFormApiErrors();

  const saveMutation = useSaveBranchOverride(itemId);
  const resetMutation = useResetBranchOverride(itemId);
  const clientErrors = useMemo(
    () => validateBranchOverrideDraft(draft),
    [draft],
  );
  const dependencyFailed =
    (branchesQuery.isError && !branchesQuery.data) ||
    (overridesQuery.isError && !overridesQuery.data);

  if (branchesQuery.isLoading || overridesQuery.isLoading) {
    return <p className="text-xs text-text-disabled">Loading branches…</p>;
  }

  if (dependencyFailed) {
    return (
      <QueryErrorState
        title="Unable to load branch overrides"
        description="Branches or existing overrides could not be loaded. Retry before editing branch-specific pricing or availability."
        onRetry={() =>
          void Promise.all([branchesQuery.refetch(), overridesQuery.refetch()])
        }
        isRetrying={branchesQuery.isFetching || overridesQuery.isFetching}
      />
    );
  }

  const branches = branchesQuery.data ?? [];
  const overrides = overridesQuery.data ?? [];
  const overrideByBranch = new Map(
    overrides.map((override) => [override.branchId, override]),
  );

  if (!branches.length) {
    return (
      <p className="text-xs text-text-disabled">No branches set up yet.</p>
    );
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-text-primary">
        Per-branch overrides{" "}
        <span className="font-normal text-text-disabled">
          (price, tax, prep time, status, or hide — leave blank to use the
          default above)
        </span>
      </label>
      {(branchesQuery.isError || overridesQuery.isError) && (
        <StaleDataBanner
          message="Branch override data could not be refreshed. Showing the latest cached configuration."
          onRetry={() =>
            void Promise.all([
              branchesQuery.refetch(),
              overridesQuery.refetch(),
            ])
          }
          isRetrying={branchesQuery.isFetching || overridesQuery.isFetching}
        />
      )}
      <div className="space-y-1.5">
        {branches.map((branch) => {
          const override = overrideByBranch.get(branch.id);
          const isEditing = editingBranchId === branch.id;
          return (
            <div
              key={branch.id}
              className="rounded-md border border-border p-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium text-text-primary">
                    {branch.name}
                  </span>
                  {override && (
                    <span className="rounded bg-primary-surface px-1.5 py-0.5 text-[11px] font-medium text-primary">
                      Overridden
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs text-text-secondary">
                  {!isEditing && (
                    <>
                      <span>
                        ₹{override?.price != null ? override.price : basePrice}
                      </span>
                      <span>
                        {override?.isHidden
                          ? "Hidden"
                          : MENU_ITEM_STATUS_OPTIONS.find(
                              (option) =>
                                option.value === (override?.status ?? "ACTIVE"),
                            )?.label}
                      </span>
                      {override && (
                        <button
                          type="button"
                          disabled={resetMutation.isPending}
                          onClick={() => resetMutation.mutate(branch.id)}
                          className="text-text-disabled hover:text-danger disabled:opacity-40"
                          title="Reset to default"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          clearErrors();
                          setDraft(toDraft(override));
                          setEditingBranchId(branch.id);
                        }}
                        className="font-medium text-primary hover:text-primary-hover"
                      >
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="mt-2 space-y-2">
                  <FormErrorSummary messages={formErrorMessages} />
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={`Price: ₹${basePrice}`}
                      value={draft.price}
                      error={fieldErrors.price ?? clientErrors.price}
                      onChange={(event) => {
                        clearFieldError("price");
                        setDraft((current) => ({
                          ...current,
                          price: event.target.value,
                        }));
                      }}
                      aria-label="Branch price override"
                    />
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder={`Tax %: ${baseTaxRate}`}
                      value={draft.taxRate}
                      error={fieldErrors.taxRate ?? clientErrors.taxRate}
                      onChange={(event) => {
                        clearFieldError("taxRate");
                        setDraft((current) => ({
                          ...current,
                          taxRate: event.target.value,
                        }));
                      }}
                      aria-label="Branch tax rate override"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder={`Prep min: ${basePrepTimeMinutes ?? "-"}`}
                      value={draft.prepTimeMinutes}
                      error={
                        fieldErrors.prepTimeMinutes ??
                        clientErrors.prepTimeMinutes
                      }
                      onChange={(event) => {
                        clearFieldError("prepTimeMinutes");
                        setDraft((current) => ({
                          ...current,
                          prepTimeMinutes: event.target.value,
                        }));
                      }}
                      aria-label="Branch prep time override (minutes)"
                    />
                    <Select
                      aria-label="Branch status override"
                      value={draft.status}
                      error={fieldErrors.status}
                      onChange={(event) => {
                        clearFieldError("status");
                        setDraft((current) => ({
                          ...current,
                          status: event.target
                            .value as BranchOverrideDraft["status"],
                        }));
                      }}
                      options={[
                        { value: "", label: "Default status" },
                        ...MENU_ITEM_STATUS_OPTIONS.map((option) => ({
                          value: option.value,
                          label: option.label,
                        })),
                      ]}
                    />
                    <label className="flex items-center gap-1.5 text-xs text-text-secondary">
                      <input
                        type="checkbox"
                        checked={draft.isHidden}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            isHidden: event.target.checked,
                          }))
                        }
                      />
                      Hide at this branch
                    </label>
                  </div>
                  <Input
                    placeholder="Reason (optional)"
                    value={draft.availabilityReason}
                    error={fieldErrors.availabilityReason}
                    onChange={(event) => {
                      clearFieldError("availabilityReason");
                      setDraft((current) => ({
                        ...current,
                        availabilityReason: event.target.value,
                      }));
                    }}
                    aria-label="Branch override reason"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        clearErrors();
                        setEditingBranchId(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      loading={saveMutation.isPending}
                      disabled={
                        saveMutation.isPending ||
                        Object.keys(clientErrors).length > 0
                      }
                      onClick={() => {
                        clearErrors();
                        if (Object.keys(clientErrors).length) return;
                        saveMutation.mutate(
                          { branchId: branch.id, input: draft },
                          {
                            onSuccess: () => setEditingBranchId(null),
                            onError: (error) =>
                              handleApiError(
                                error,
                                [
                                  "price",
                                  "taxRate",
                                  "prepTimeMinutes",
                                  "status",
                                  "isHidden",
                                  "availabilityReason",
                                ],
                                "Failed to save branch override",
                              ),
                          },
                        );
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
