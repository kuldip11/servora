import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button, Card, QueryErrorState, StaleDataBanner } from "@pos/ui";
import { useInventoryItems } from "@/features/inventory";
import {
  useSubRecipes,
  subRecipeQueryKey,
} from "@/features/menu/hooks/useSubRecipes";
import { menuSubRecipesService } from "@/features/menu/services/menu-sub-recipes.service";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { SubRecipeEditor } from "./SubRecipeEditor";

export const SubRecipeManager = () => {
  const queryClient = useQueryClient();
  const subRecipesQuery = useSubRecipes();
  const inventoryQuery = useInventoryItems({ limit: 100 });
  const subRecipes = subRecipesQuery.data;
  const inventory = inventoryQuery.data?.items;
  const [open, setOpen] = useState(false);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: subRecipeQueryKey() });
  const create = useMutation({
    mutationFn: menuSubRecipesService.create,
    onSuccess: async () => {
      await refresh();
      setOpen(false);
      notifySuccess("Sub-recipe created");
    },
  });
  const remove = useMutation({
    mutationFn: menuSubRecipesService.remove,
    onSuccess: async () => {
      await refresh();
      notifySuccess("Sub-recipe deleted");
    },
    onError: (error) => notifyError(error, "Could not delete sub-recipe"),
  });

  const dependencyFailed =
    (subRecipesQuery.isError && !subRecipesQuery.data) ||
    (inventoryQuery.isError && !inventoryQuery.data);
  if (dependencyFailed) {
    return (
      <QueryErrorState
        title="Unable to load recipe components"
        description="Sub-recipes or inventory could not be loaded. Retry before creating a prepared component so missing ingredients are not treated as an empty catalog."
        onRetry={() =>
          void Promise.all([
            subRecipesQuery.refetch(),
            inventoryQuery.refetch(),
          ])
        }
        isRetrying={subRecipesQuery.isFetching || inventoryQuery.isFetching}
      />
    );
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            Prepared components / sub-recipes
          </h3>
          <p className="mt-1 text-xs text-text-secondary">
            Model sauces, doughs and prep batches once, then reuse them inside
            dish recipes.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={subRecipesQuery.isLoading || inventoryQuery.isLoading}
          onClick={() => setOpen((value) => !value)}
        >
          <Plus className="h-4 w-4" /> New sub-recipe
        </Button>
      </div>

      {subRecipesQuery.isError || inventoryQuery.isError ? (
        <div className="mt-3">
          <StaleDataBanner
            message="Recipe component data could not be refreshed. Showing the latest cached inventory and sub-recipes."
            onRetry={() =>
              void Promise.all([
                subRecipesQuery.refetch(),
                inventoryQuery.refetch(),
              ])
            }
            isRetrying={subRecipesQuery.isFetching || inventoryQuery.isFetching}
          />
        </div>
      ) : null}

      {subRecipes?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {subRecipes.map((row) => (
            <span
              key={row.id}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-secondary px-3 py-1.5 text-xs"
            >
              <strong>{row.name}</strong>
              <span className="text-text-secondary">
                {row.yieldQuantity} {row.yieldUnit}
                {row.yieldPercent ? ` · ${row.yieldPercent}% yield` : ""}
              </span>
              <button
                type="button"
                aria-label={`Delete ${row.name}`}
                disabled={remove.isPending}
                onClick={() => remove.mutate(row.id)}
                className="text-text-disabled hover:text-danger disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <SubRecipeEditor
        open={open}
        inventory={inventory ?? []}
        subRecipes={subRecipes ?? []}
        isSaving={create.isPending}
        onToggle={() => setOpen((value) => !value)}
        onCreate={(payload, onError, onSuccessReset) =>
          create.mutate(payload, {
            onError,
            onSuccess: () => onSuccessReset(),
          })
        }
      />
    </Card>
  );
};
