import { useQuery } from "@tanstack/react-query";
import { Button } from "@pos/ui";
import { createMenuApi } from "@pos/api-client";
import type {
  Promotion,
  PromotionStats as PromotionStatsData,
} from "@pos/types";
import { apiClient } from "@/shared/lib/api-client";

const menuApi = createMenuApi(apiClient);

const PromotionStats = ({ id }: { id: string }) => {
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
};

type Props = {
  promotions: Promotion[] | undefined;
  onEdit: (promotion: Promotion) => void;
  onToggle: (promotion: Promotion) => void;
  onDelete: (promotion: Promotion) => void;
};

export const PromotionList = ({
  promotions,
  onEdit,
  onToggle,
  onDelete,
}: Props) => (
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
        <Button size="sm" variant="secondary" onClick={() => onEdit(promotion)}>
          Edit
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onToggle(promotion)}
        >
          {promotion.isActive ? "Disable" : "Enable"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDelete(promotion)}>
          Delete
        </Button>
      </div>
    ))}
  </div>
);
