import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Select } from "@pos/ui";
import { createMenuApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";
import { useMenuCategories } from "@/features/menu/hooks/useMenuCategories";
import { usePromotionFormState } from "@/features/menu/hooks/usePromotionFormState";

const menuApi = createMenuApi(apiClient);
import type {
  Promotion,
  PromotionStats as PromotionStatsData,
} from "@pos/types";

function PromotionStats({ id }: { id: string }) {
  const { data } = useQuery<PromotionStatsData>({
    queryKey: ["menu", "promotions", id, "stats"],
    queryFn: () => menuApi.promotionStats<PromotionStatsData>(id),
  });
  return (
    <span>
      {data
        ? `${data.uses} uses · ${Number(data.discountAmount).toFixed(2)} discounted`
        : "Loading stats…"}
    </span>
  );
}

export const PromotionsSection = () => {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useMenuCategories();
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
    setEditingId,
  } = usePromotionFormState();
  const key = ["menu", "promotions"];
  const { data: promotions = [] } = useQuery<Promotion[]>({
    queryKey: key,
    queryFn: () => menuApi.listPromotionsFor<Promotion>(),
  });
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
      queryClient.invalidateQueries({ queryKey: key });
      resetAfterSave();
    },
  });
  const update = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      menuApi.updatePromotion<Promotion>(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => menuApi.removePromotion(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const bogoValid =
    ruleType !== "BOGO" ||
    (triggerId &&
      Number(triggerQuantity) > 0 &&
      Number(rewardQuantity) > 0 &&
      Number(rewardDiscountPercent) > 0 &&
      (rewardType === "SAME" || rewardId));
  const ordinaryValid =
    ruleType === "BOGO" ||
    (Number(value) > 0 && (scope === "ORDER" || targetId));

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
      <div className="grid max-w-5xl gap-3 rounded-xl border border-border p-4 md:grid-cols-3">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Select
          label="Type"
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
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        )}
        {ruleType !== "BOGO" && (
          <Select
            label="Scope"
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
            value={targetId}
            options={[
              {
                value: "",
                label:
                  scope === "CATEGORY" ? "Choose a category" : "Choose an item",
              },
              ...(scope === "CATEGORY" ? categoryOptions : itemOptions),
            ]}
            onChange={(e) => setTargetId(e.target.value)}
          />
        )}
        {ruleType === "BOGO" && (
          <>
            <Select
              label="Buy target"
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
              onChange={(e) => setTriggerId(e.target.value)}
            />
            <Input
              label="Buy quantity"
              type="number"
              value={triggerQuantity}
              onChange={(e) => setTriggerQuantity(e.target.value)}
            />
            <Select
              label="Reward target"
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
                onChange={(e) => setRewardId(e.target.value)}
              />
            )}
            <Input
              label="Reward quantity"
              type="number"
              value={rewardQuantity}
              onChange={(e) => setRewardQuantity(e.target.value)}
            />
            <Input
              label="Reward discount %"
              type="number"
              value={rewardDiscountPercent}
              onChange={(e) => setRewardDiscountPercent(e.target.value)}
            />
          </>
        )}
        <Input
          label="Coupon code (optional)"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
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
          onChange={(e) => setEndDate(e.target.value)}
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
          onChange={(e) => setEndTime(e.target.value)}
        />
        <Input
          label="Max uses total"
          type="number"
          value={maxUsesTotal}
          onChange={(e) => setMaxUsesTotal(e.target.value)}
        />
        <Input
          label="Max uses / customer"
          type="number"
          value={maxUsesPerCustomer}
          onChange={(e) => setMaxUsesPerCustomer(e.target.value)}
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
            disabled={!name.trim() || !bogoValid || !ordinaryValid}
            loading={create.isPending}
            onClick={() => create.mutate()}
          >
            {editingId ? "Save promotion" : "Create promotion"}
          </Button>
          {editingId && (
            <Button
              variant="secondary"
              onClick={() => {
                setEditingId(null);
                setName("");
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {promotions.map((promotion) => (
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
              onClick={() => beginEdit(promotion)}
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
