import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QueryErrorState, StaleDataBanner } from "@pos/ui";
import { createMenuApi } from "@pos/api-client";
import type { Promotion } from "@pos/types";
import { apiClient } from "@/shared/lib/api-client";
import { useMenuCategories } from "@/features/menu";
import { usePromotionFormState } from "@/features/menu/hooks/usePromotionFormState";
import { notifyError } from "@/shared/lib/notify";
import { useLocalFormApiErrors } from "@/shared/hooks/useLocalFormApiErrors";
import { validatePromotionForm } from "@/features/menu/helpers/promotion-form";
import { buildPromotionPayload } from "@/features/menu/helpers/promotion-payload";
import { PromotionForm } from "./PromotionForm";
import { PromotionList } from "./PromotionList";

const menuApi = createMenuApi(apiClient);
const promotionFields = [
  "name",
  "value",
  "couponCode",
  "targetId",
  "triggerId",
  "rewardId",
  "triggerQuantity",
  "rewardQuantity",
  "rewardDiscountPercent",
  "startDate",
  "endDate",
  "startTime",
  "endTime",
  "maxUsesTotal",
  "maxUsesPerCustomer",
] as const;

export const PromotionsSection = () => {
  const queryClient = useQueryClient();
  const categoriesQuery = useMenuCategories();
  const categories = categoriesQuery.data ?? [];
  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }));
  const itemOptions = categories.flatMap((category) =>
    (category.menuItems ?? []).map((item) => ({
      value: item.id,
      label: `${item.name} · ${category.name}`,
    })),
  );
  const form = usePromotionFormState();
  const key = ["menu", "promotions"];
  const promotionsQuery = useQuery<Promotion[]>({
    queryKey: key,
    queryFn: () => menuApi.listPromotionsFor<Promotion>(),
  });
  const promotions = promotionsQuery.data;
  const {
    fieldErrors,
    formErrorMessages,
    clearErrors,
    clearFieldError,
    fieldError,
    touchField,
    markSubmitted,
    resetValidation,
    handleApiError,
  } = useLocalFormApiErrors();

  const create = useMutation({
    mutationFn: () =>
      form.editingId
        ? menuApi.updatePromotion<Promotion>(
            form.editingId,
            buildPromotionPayload(form),
          )
        : menuApi.createPromotion<Promotion>(buildPromotionPayload(form)),
    onSuccess: () => {
      resetValidation();
      void queryClient.invalidateQueries({ queryKey: key });
      form.resetAfterSave();
    },
  });
  const update = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      menuApi.updatePromotion<Promotion>(id, { isActive }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key }),
    onError: (error) => notifyError(error, "Failed to update promotion"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => menuApi.removePromotion(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key }),
    onError: (error) => notifyError(error, "Failed to delete promotion"),
  });

  const clientErrors = validatePromotionForm(form);
  const formInvalid = Object.keys(clientErrors).length > 0;
  const categoryDependencyRequired =
    form.ruleType === "BOGO" ||
    form.scope === "CATEGORY" ||
    form.scope === "ITEM";
  const categoryDependencyFailed =
    categoryDependencyRequired &&
    categoriesQuery.isError &&
    !categoriesQuery.data;

  const submit = () => {
    markSubmitted();
    clearErrors();
    if (formInvalid || categoryDependencyFailed || !form.isDirty) return;
    create.mutate(undefined, {
      onError: (error) =>
        handleApiError(
          error,
          [...promotionFields],
          "Failed to save promotion",
          {
            scopeCategoryId: "targetId",
            scopeMenuItemId: "targetId",
            triggerMenuItemId: "triggerId",
            triggerCategoryId: "triggerId",
            rewardMenuItemId: "rewardId",
            rewardCategoryId: "rewardId",
          },
        ),
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-semibold text-text-primary">
          Promotions & coupons
        </h2>
        <p className="text-sm text-text-secondary">
          Stage 5 runs after resolved item/modifier/combo prices. Usage limits
          are committed transactionally and loyalty stacking is explicit.
        </p>
      </div>
      {promotionsQuery.isError && !promotions ? (
        <QueryErrorState
          title="Unable to load promotions"
          description="Promotions could not be loaded. Retry before making promotion changes."
          onRetry={() => void promotionsQuery.refetch()}
          isRetrying={promotionsQuery.isFetching}
        />
      ) : null}
      {promotionsQuery.isError && promotions ? (
        <StaleDataBanner
          message="Promotion refresh failed — showing the last available promotions."
          onRetry={() => void promotionsQuery.refetch()}
          isRetrying={promotionsQuery.isFetching}
        />
      ) : null}
      {categoryDependencyFailed ? (
        <QueryErrorState
          title="Unable to load promotion targets"
          description="Menu items and categories are required to configure the selected promotion. Retry before saving."
          onRetry={() => void categoriesQuery.refetch()}
          isRetrying={categoriesQuery.isFetching}
        />
      ) : null}
      {categoriesQuery.isError && categoriesQuery.data ? (
        <StaleDataBanner
          message="Menu-item/category refresh failed — promotion targeting uses the last available options."
          onRetry={() => void categoriesQuery.refetch()}
          isRetrying={categoriesQuery.isFetching}
        />
      ) : null}

      <PromotionForm
        form={form}
        clientErrors={clientErrors}
        fieldErrors={fieldErrors}
        formErrorMessages={formErrorMessages}
        itemOptions={itemOptions}
        categoryOptions={categoryOptions}
        fieldError={fieldError}
        clearFieldError={clearFieldError}
        touchField={touchField}
        invalid={formInvalid}
        dependencyFailed={categoryDependencyFailed}
        saving={create.isPending}
        onSubmit={submit}
        onCancel={() => {
          resetValidation();
          form.cancelEdit();
        }}
      />

      <PromotionList
        promotions={promotions}
        onEdit={(promotion) => {
          resetValidation();
          form.beginEdit(promotion);
        }}
        onToggle={(promotion) =>
          update.mutate({ id: promotion.id, isActive: !promotion.isActive })
        }
        onDelete={(promotion) => remove.mutate(promotion.id)}
      />
    </div>
  );
};
