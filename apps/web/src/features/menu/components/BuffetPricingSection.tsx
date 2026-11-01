import { useState } from "react";
import {
  Button,
  Input,
  QueryErrorState,
  Select,
  StaleDataBanner,
} from "@pos/ui";
import {
  useDeletePerCoverPriceRule,
  usePerCoverPriceRules,
  useSavePerCoverPriceRule,
} from "@/features/menu/hooks/useBuffetPricing";

export const BuffetPricingSection = () => {
  const [tier, setTier] = useState<"" | "ADULT" | "CHILD">("");
  const [price, setPrice] = useState("");
  const rulesQuery = usePerCoverPriceRules();
  const rules = (rulesQuery.data ?? []).filter((rule) => rule.isPerCover);
  const save = useSavePerCoverPriceRule();
  const remove = useDeletePerCoverPriceRule();
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
        <Select
          label="Cover tier"
          value={tier}
          onChange={(value) => setTier(value as typeof tier)}
          options={[
            { value: "", label: "Any cover" },
            { value: "ADULT", label: "Adult" },
            { value: "CHILD", label: "Child" },
          ]}
        />
        <Input
          label="Rate per cover"
          required
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
          onClick={() =>
            save.mutate(
              { tier, price: Number(price) },
              { onSuccess: () => setPrice("") },
            )
          }
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
