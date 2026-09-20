import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  FormErrorSummary,
  Input,
  QueryErrorState,
  Select,
  StaleDataBanner,
} from "@pos/ui";
import { createMenuApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";
import { useMenuCategories } from "@/features/menu/hooks/useMenuCategories";
import { usePromotionFormState } from "@/features/menu/hooks/usePromotionFormState";
import { notifyError } from "@/shared/lib/notify";
import { useLocalFormApiErrors } from "@/shared/hooks/useLocalFormApiErrors";
import { validatePromotionForm } from "@/features/menu/helpers/promotion-form";

const menuApi = createMenuApi(apiClient);
import type {
  Promotion,
  PromotionStats as PromotionStatsData,
} from "@pos/types";

function PromotionStats({ id }: { id: string }) {
  const statsQuery = useQuery<PromotionStatsData>({
    queryKey: ["menu", "promotions", id, "stats"],
    queryFn: () => menuApi.promotionStats<PromotionStatsData>(id),
  });
  return (
    <span>
      {statsQuery.data
        ? `${statsQuery.data.uses} uses · ${Number(statsQuery.data.discountAmount).toFixed(2)} discounted`
        : statsQuery.isError
          ? "Stats unavailable"
          : "Loading stats…"}
    </span>
  );
}

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
  const {
    editingId,
    name,
    ruleType,
    scope,
    value,
    couponCode,
    targetId,
    startDate,
    endDate,
    startTime,
    endTime,
    maxUsesTotal,
    maxUsesPerCustomer,
    triggerType,
    triggerId,
    rewardType,
    rewardId,
    triggerQuantity,
    rewardQuantity,
    rewardDiscountPercent,
    stackableWithLoyalty,
    beginEdit,
    resetAfterSave,
    cancelEdit,
    isDirty,
    setName,
    setRuleType,
    setScope,
    setValue,
    setCouponCode,
    setTargetId,
    setStartDate,
    setEndDate,
    setStartTime,
    setEndTime,
    setMaxUsesTotal,
    setMaxUsesPerCustomer,
    setTriggerType,
    setTriggerId,
    setRewardType,
    setRewardId,
    setTriggerQuantity,
    setRewardQuantity,
    setRewardDiscountPercent,
    setStackableWithLoyalty,
  } = usePromotionFormState();
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
    mutationFn: () => {
      const payload = {
        name,
        ruleType,
        scope: ruleType === "BOGO" ? "ORDER" : scope,
        ...(ruleType !== "BOGO" ? { value: Number(value) } : {}),
        scopeCategoryId:
          ruleType !== "BOGO" && scope === "CATEGORY" ? targetId : null,
        scopeMenuItemId:
          ruleType !== "BOGO" && scope === "ITEM" ? targetId : null,
        triggerMenuItemId:
          ruleType === "BOGO" && triggerType === "ITEM" ? triggerId : null,
        triggerCategoryId:
          ruleType === "BOGO" && triggerType === "CATEGORY" ? triggerId : null,
        rewardMenuItemId:
          ruleType === "BOGO" && rewardType === "ITEM" ? rewardId : null,
        rewardCategoryId:
          ruleType === "BOGO" && rewardType === "CATEGORY" ? rewardId : null,
        ...(ruleType === "BOGO"
          ? {
              triggerQuantity: Number(triggerQuantity),
              rewardQuantity: Number(rewardQuantity),
              rewardDiscountPercent: Number(rewardDiscountPercent),
            }
          : {}),
        couponCode: couponCode.trim() || null,
        startDate: startDate || null,
        endDate: endDate || null,
        startTime: startTime || null,
        endTime: endTime || null,
        maxUsesTotal: maxUsesTotal ? Number(maxUsesTotal) : null,
        maxUsesPerCustomer: maxUsesPerCustomer
          ? Number(maxUsesPerCustomer)
          : null,
        stackableWithLoyalty,
      };
      return editingId
        ? menuApi.updatePromotion<Promotion>(editingId, payload)
        : menuApi.createPromotion<Promotion>(payload);
    },
    onSuccess: () => {
      resetValidation();
      queryClient.invalidateQueries({ queryKey: key });
      resetAfterSave();
    },
  });
  const update = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      menuApi.updatePromotion<Promotion>(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
    onError: (error) => notifyError(error, "Failed to update promotion"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => menuApi.removePromotion(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
    onError: (error) => notifyError(error, "Failed to delete promotion"),
  });

  const clientErrors = validatePromotionForm({
    name,
    ruleType,
    scope,
    value,
    targetId,
    startDate,
    endDate,
    startTime,
    endTime,
    maxUsesTotal,
    maxUsesPerCustomer,
    triggerId,
    rewardType,
    rewardId,
    triggerQuantity,
    rewardQuantity,
    rewardDiscountPercent,
  });
  const formInvalid = Object.keys(clientErrors).length > 0;
  const categoryDependencyRequired =
    ruleType === "BOGO" || scope === "CATEGORY" || scope === "ITEM";
  const categoryDependencyFailed =
    categoryDependencyRequired &&
    categoriesQuery.isError &&
    !categoriesQuery.data;

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
      <div className="grid max-w-5xl gap-3 rounded-xl border border-border p-4 md:grid-cols-3">
        <div className="md:col-span-3">
          <FormErrorSummary messages={formErrorMessages} />
        </div>
        <Input
          label="Name"
          required
          value={name}
          error={fieldError("name", clientErrors.name)}
          onBlur={() => touchField("name")}
          onChange={(e) => {
            clearFieldError("name");
            setName(e.target.value);
          }}
        />
        <Select
          label="Type"
          required
          value={ruleType}
          onChange={(e) => setRuleType(e.target.value as Promotion["ruleType"])}
          options={[
            { value: "PERCENTAGE", label: "Percentage" },
            { value: "FIXED_AMOUNT", label: "Fixed amount" },
            { value: "BOGO", label: "Buy / get" },
          ]}
        />
        {ruleType !== "BOGO" && (
          <Input
            label={ruleType === "PERCENTAGE" ? "Percent off" : "Amount off"}
            required
            type="number"
            value={value}
            error={fieldError("value", clientErrors.value)}
            onBlur={() => touchField("value")}
            onChange={(e) => {
              clearFieldError("value");
              setValue(e.target.value);
            }}
          />
        )}
        {ruleType !== "BOGO" && (
          <Select
            label="Scope"
            required
            value={scope}
            onChange={(e) => setScope(e.target.value as Promotion["scope"])}
            options={[
              { value: "ORDER", label: "Whole order" },
              { value: "CATEGORY", label: "Category" },
              { value: "ITEM", label: "Menu item" },
            ]}
          />
        )}
        {ruleType !== "BOGO" && scope !== "ORDER" && (
          <Select
            label={scope === "CATEGORY" ? "Category" : "Menu item"}
            required
            value={targetId}
            options={[
              {
                value: "",
                label:
                  scope === "CATEGORY" ? "Choose a category" : "Choose an item",
              },
              ...(scope === "CATEGORY" ? categoryOptions : itemOptions),
            ]}
            error={fieldError("targetId", clientErrors.targetId)}
            onBlur={() => touchField("targetId")}
            onChange={(e) => {
              clearFieldError("targetId");
              setTargetId(e.target.value);
            }}
          />
        )}
        {ruleType === "BOGO" && (
          <>
            <Select
              label="Buy target"
              required
              value={triggerType}
              onChange={(e) =>
                setTriggerType(e.target.value as "ITEM" | "CATEGORY")
              }
              options={[
                { value: "ITEM", label: "Menu item" },
                { value: "CATEGORY", label: "Category" },
              ]}
            />
            <Select
              label={triggerType === "ITEM" ? "Buy item" : "Buy category"}
              required
              value={triggerId}
              options={[
                {
                  value: "",
                  label:
                    triggerType === "ITEM"
                      ? "Choose an item"
                      : "Choose a category",
                },
                ...(triggerType === "ITEM" ? itemOptions : categoryOptions),
              ]}
              error={fieldError("triggerId", clientErrors.triggerId)}
              onBlur={() => touchField("triggerId")}
              onChange={(e) => {
                clearFieldError("triggerId");
                setTriggerId(e.target.value);
              }}
            />
            <Input
              label="Buy quantity"
              required
              type="number"
              value={triggerQuantity}
              error={fieldError(
                "triggerQuantity",
                clientErrors.triggerQuantity,
              )}
              onBlur={() => touchField("triggerQuantity")}
              onChange={(e) => {
                clearFieldError("triggerQuantity");
                setTriggerQuantity(e.target.value);
              }}
            />
            <Select
              label="Reward target"
              required
              value={rewardType}
              onChange={(e) =>
                setRewardType(e.target.value as "SAME" | "ITEM" | "CATEGORY")
              }
              options={[
                { value: "SAME", label: "Same as buy target" },
                { value: "ITEM", label: "Menu item" },
                { value: "CATEGORY", label: "Category" },
              ]}
            />
            {rewardType !== "SAME" && (
              <Select
                label={
                  rewardType === "ITEM" ? "Reward item" : "Reward category"
                }
                required
                value={rewardId}
                options={[
                  {
                    value: "",
                    label:
                      rewardType === "ITEM"
                        ? "Choose an item"
                        : "Choose a category",
                  },
                  ...(rewardType === "ITEM" ? itemOptions : categoryOptions),
                ]}
                error={fieldError("rewardId", clientErrors.rewardId)}
                onBlur={() => touchField("rewardId")}
                onChange={(e) => {
                  clearFieldError("rewardId");
                  setRewardId(e.target.value);
                }}
              />
            )}
            <Input
              label="Reward quantity"
              required
              type="number"
              value={rewardQuantity}
              error={fieldError("rewardQuantity", clientErrors.rewardQuantity)}
              onBlur={() => touchField("rewardQuantity")}
              onChange={(e) => {
                clearFieldError("rewardQuantity");
                setRewardQuantity(e.target.value);
              }}
            />
            <Input
              label="Reward discount %"
              required
              type="number"
              value={rewardDiscountPercent}
              error={fieldError(
                "rewardDiscountPercent",
                clientErrors.rewardDiscountPercent,
              )}
              onBlur={() => touchField("rewardDiscountPercent")}
              onChange={(e) => {
                clearFieldError("rewardDiscountPercent");
                setRewardDiscountPercent(e.target.value);
              }}
            />
          </>
        )}
        <Input
          label="Coupon code (optional)"
          value={couponCode}
          error={fieldErrors.couponCode}
          onChange={(e) => {
            clearFieldError("couponCode");
            setCouponCode(e.target.value.toUpperCase());
          }}
        />
        <Input
          label="Start date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <Input
          label="End date"
          type="date"
          value={endDate}
          error={fieldError("endDate", clientErrors.endDate)}
          onBlur={() => touchField("endDate")}
          onChange={(e) => {
            clearFieldError("endDate");
            setEndDate(e.target.value);
          }}
        />
        <Input
          label="Start time"
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
        <Input
          label="End time"
          type="time"
          value={endTime}
          error={fieldError("endTime", clientErrors.endTime)}
          onBlur={() => touchField("endTime")}
          onChange={(e) => {
            clearFieldError("endTime");
            setEndTime(e.target.value);
          }}
        />
        <Input
          label="Max uses total"
          type="number"
          value={maxUsesTotal}
          error={fieldError("maxUsesTotal", clientErrors.maxUsesTotal)}
          onBlur={() => touchField("maxUsesTotal")}
          onChange={(e) => {
            clearFieldError("maxUsesTotal");
            setMaxUsesTotal(e.target.value);
          }}
        />
        <Input
          label="Max uses / customer"
          type="number"
          value={maxUsesPerCustomer}
          error={fieldError(
            "maxUsesPerCustomer",
            clientErrors.maxUsesPerCustomer,
          )}
          onBlur={() => touchField("maxUsesPerCustomer")}
          onChange={(e) => {
            clearFieldError("maxUsesPerCustomer");
            setMaxUsesPerCustomer(e.target.value);
          }}
        />
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={stackableWithLoyalty}
            onChange={(e) => setStackableWithLoyalty(e.target.checked)}
          />{" "}
          Stackable with loyalty
        </label>
        <div className="flex items-end gap-2">
          <Button
            disabled={
              create.isPending ||
              formInvalid ||
              !isDirty ||
              categoryDependencyFailed
            }
            loading={create.isPending}
            onClick={() => {
              markSubmitted();
              clearErrors();
              if (formInvalid || categoryDependencyFailed || !isDirty) return;
              create.mutate(undefined, {
                onError: (error) =>
                  handleApiError(
                    error,
                    [
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
                    ],
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
            }}
          >
            {editingId ? "Save promotion" : "Create promotion"}
          </Button>
          {editingId && (
            <Button
              variant="secondary"
              onClick={() => {
                resetValidation();
                cancelEdit();
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {promotions?.map((promotion) => (
          <div
            key={promotion.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-text-primary">{promotion.name}</p>
              <p className="text-xs text-text-secondary">
                {promotion.ruleType} ·{" "}
                {promotion.ruleType === "BOGO"
                  ? `buy ${promotion.triggerQuantity}, reward ${promotion.rewardQuantity} @ ${promotion.rewardDiscountPercent}%`
                  : `${promotion.scope} · ${promotion.value}${promotion.ruleType === "PERCENTAGE" ? "%" : ""}`}{" "}
                · {promotion.couponCode ?? "automatic"} ·{" "}
                {promotion.stackableWithLoyalty
                  ? "stacks with loyalty"
                  : "exclusive vs loyalty"}
              </p>
              <p className="mt-1 text-xs text-text-disabled">
                <PromotionStats id={promotion.id} />
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                resetValidation();
                beginEdit(promotion);
              }}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                update.mutate({
                  id: promotion.id,
                  isActive: !promotion.isActive,
                })
              }
            >
              {promotion.isActive ? "Disable" : "Enable"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => remove.mutate(promotion.id)}
            >
              Delete
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
