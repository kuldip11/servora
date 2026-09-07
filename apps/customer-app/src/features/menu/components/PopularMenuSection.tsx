import { Plus, ShoppingBag, Sparkles } from "lucide-react";
import type { CustomerCombo, CustomerMenuItem } from "@/api";
import { formatMoney } from "@/shared/utils/money";
import { MenuCard } from "@/features/menu/MenuCard";

const itemImage = (item: CustomerMenuItem) =>
  item.imageUrl ?? item.images[0]?.url;
const itemPrice = (item: CustomerMenuItem) => {
  if (item.pricingMode === "OPEN") return "Staff priced";
  if (item.pricingMode === "WEIGHT_BASED")
    return `${formatMoney(Number(item.basePrice))}/${String(item.weightUnit ?? "unit").toLowerCase()}`;
  return formatMoney(Number(item.basePrice));
};

interface PopularMenuSectionProps {
  items: CustomerMenuItem[];
  combos: CustomerCombo[];
  onOpenItem: (item: CustomerMenuItem) => void;
  onOpenCombo: (combo: CustomerCombo) => void;
}

export const PopularMenuSection = ({
  items,
  combos,
  onOpenItem,
  onOpenCombo,
}: PopularMenuSectionProps) => {
  const featuredItem = items[0];
  const featuredImage = featuredItem ? itemImage(featuredItem) : undefined;
  return (
    <section id="menu-section-popular" className="scroll-mt-24 pb-4">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#d45d24]">
            Tonight&apos;s menu
          </p>
          <h2 className="customer-display mt-1 text-3xl font-bold tracking-tight">
            Popular
          </h2>
        </div>
        <span className="pb-1 text-xs text-text-secondary">
          {items.length} dishes
        </span>
      </div>
      {featuredItem ? (
        <button
          type="button"
          onClick={() => onOpenItem(featuredItem)}
          className="group relative mb-7 min-h-52 w-full overflow-hidden rounded-[24px] bg-gradient-to-br from-[#d96b31] to-[#87331e] p-5 text-left text-white shadow-[0_14px_32px_rgba(93,37,18,0.22)] sm:min-h-64 sm:p-7"
        >
          {featuredImage ? (
            <img
              src={featuredImage}
              alt=""
              className="absolute inset-y-0 right-0 h-full w-[48%] object-cover opacity-90 [mask-image:linear-gradient(to_right,transparent,black_30%)]"
              loading="eager"
              decoding="async"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-transparent" />
          <div className="relative z-10 flex min-h-40 flex-col items-start sm:min-h-48">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] backdrop-blur">
              <Sparkles className="h-3 w-3" /> Popular tonight
            </span>
            <h3 className="customer-display mt-4 max-w-[65%] text-2xl font-bold leading-tight sm:text-4xl">
              {featuredItem.name}
            </h3>
            {featuredItem.description ? (
              <p className="mt-2 line-clamp-2 max-w-[64%] text-xs leading-5 text-white/75 sm:text-sm">
                {featuredItem.description}
              </p>
            ) : null}
            <div className="mt-auto flex w-full items-end justify-between pt-5">
              <strong className="text-base">{itemPrice(featuredItem)}</strong>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#87331e] shadow-lg transition-transform group-hover:scale-105">
                <Plus className="h-5 w-5" />
              </span>
            </div>
          </div>
        </button>
      ) : null}
      {combos.length > 0 ? (
        <div className="mb-6">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#d45d24]">
                Set meals
              </p>
              <h3 className="customer-display mt-1 text-2xl font-bold">
                Made to share
              </h3>
            </div>
            <span className="text-xs text-text-secondary">
              Choose step by step
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {combos.map((combo) => (
              <button
                key={combo.id}
                type="button"
                onClick={() => onOpenCombo(combo)}
                className="flex min-h-28 items-center gap-4 rounded-2xl border border-border bg-surface p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#f4dfbd] text-[#8b4b24]">
                  <ShoppingBag className="h-6 w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-text-primary">
                    {combo.name}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-xs leading-5 text-text-secondary">
                    {combo.description ??
                      `${combo.slots.length} guided choices`}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {items.length > 1 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {items.slice(1).map((item) => (
            <MenuCard key={item.id} item={item} onSelect={onOpenItem} />
          ))}
        </div>
      ) : null}
    </section>
  );
};
