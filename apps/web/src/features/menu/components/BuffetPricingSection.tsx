import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Input, QueryErrorState, StaleDataBanner } from "@pos/ui";
import type { PriceRule } from "@pos/types";
import { createMenuApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const menuApi = createMenuApi(apiClient);
import { queryClient } from "@/shared/lib/query-client";
import { notifyError, notifySuccess } from "@/shared/lib/notify";

export const BuffetPricingSection = () => {
  const [tier, setTier] = useState<"" | "ADULT" | "CHILD">("");
  const [price, setPrice] = useState("");
  const key = ["menu", "per-cover-price-rules"];
  const rulesQuery = useQuery<PriceRule[]>({
    queryKey: key,
    queryFn: () => menuApi.listPriceRulesFor<PriceRule>(),
  });
  const rules = (rulesQuery.data ?? []).filter((rule) => rule.isPerCover);
  const save = useMutation({
    mutationFn: () =>
      menuApi.createPriceRule<PriceRule>({
        isPerCover: true,
        coverTier: tier || null,
        price: Number(price),
        priority: 0,
      }),
    onSuccess: async () => {
      setPrice("");
      await queryClient.invalidateQueries({ queryKey: key });
      notifySuccess("Per-cover rate saved");
    },
    onError: (error) => notifyError(error, "Failed to save per-cover rate"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => menuApi.removePriceRule(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
    onError: (error) => notifyError(error, "Failed to remove per-cover rate"),
  });
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          Buffet / per-cover pricing
        </h2>
        <p className="mt-0.5 text-sm text-text-secondary">
          Rates still resolve through the normal PricingPipeline; buffet item
          lines remain kitchen/inventory records and are excluded from billing.
        </p>
      </div>
      {rulesQuery.isError && !rulesQuery.data ? (
        <QueryErrorState
          title="Unable to load per-cover rates"
          description="Pricing rules could not be loaded. Retry before changing buffet pricing."
          onRetry={() => void rulesQuery.refetch()}
          isRetrying={rulesQuery.isFetching}
        />
      ) : null}
      {rulesQuery.isError && rulesQuery.data ? (
        <StaleDataBanner
          message="Per-cover rates could not be refreshed. Showing cached pricing."
          onRetry={() => void rulesQuery.refetch()}
          isRetrying={rulesQuery.isFetching}
        />
      ) : null}
      <div className="grid max-w-xl grid-cols-2 gap-2">
        <label className="text-sm font-medium text-text-primary">
          Cover tier
          <select
            className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={tier}
            onChange={(event) => setTier(event.target.value as typeof tier)}
          >
            <option value="">Any cover</option>
            <option value="ADULT">Adult</option>
            <option value="CHILD">Child</option>
          </select>
        </label>
        <Input
          label="Rate per cover"
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
        />
        <Button
          type="button"
          disabled={
            !price ||
            !Number.isFinite(Number(price)) ||
            Number(price) < 0 ||
            (rulesQuery.isError && !rulesQuery.data)
          }
          loading={save.isPending}
          onClick={() => save.mutate()}
        >
          Add rate
        </Button>
      </div>
      <div className="space-y-2">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="flex items-center justify-between rounded border border-border px-3 py-2 text-sm"
          >
            <span>
              {rule.coverTier ?? "Any cover"} · ₹
              {Number(rule.price ?? 0).toFixed(2)}
            </span>
            <Button
              type="button"
              size="sm"
              variant="danger"
              onClick={() => remove.mutate(rule.id)}
            >
              Remove
            </Button>
          </div>
        ))}
        {rules.length === 0 && (
          <p className="text-sm text-text-secondary">
            No per-cover rates configured.
          </p>
        )}
      </div>
    </section>
  );
};
