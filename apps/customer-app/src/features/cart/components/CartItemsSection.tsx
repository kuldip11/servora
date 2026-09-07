import { Minus, Plus, Utensils } from "lucide-react";
import { IconButton } from "@pos/ui";
import { comboLineKey, type ComboCartLine } from "../combo";
import { getLineSubtotal, type CartLine } from "../pricing";
import { formatMoney } from "@/shared/utils/money";

const lineChoices = (line: CartLine) => {
  const variant = line.item.variants.find(
    (value) => value.id === line.variantId,
  );
  const options = line.selectedOptions.flatMap((selection) => {
    const option = line.item.modifierGroupLinks
      .flatMap(({ group }) => group.options)
      .find((value) => value.id === selection.optionId);
    if (!option) return [];
    const zone =
      selection.zoneLabel && selection.zoneLabel !== "WHOLE"
        ? ` (${selection.zoneLabel.toLowerCase()})`
        : "";
    return `${selection.quantity > 1 ? `${selection.quantity} × ` : ""}${option.name}${zone}`;
  });
  return [variant?.name, ...options].filter(Boolean).join(" · ");
};

type CartItemsSectionProps = {
  cart: CartLine[];
  combos: ComboCartLine[];
  onChange: (index: number, delta: number) => void;
  onComboChange: (index: number, delta: number) => void;
  onEdit: (index: number) => void;
};

export const CartItemsSection = ({
  cart,
  combos,
  onChange,
  onComboChange,
  onEdit,
}: CartItemsSectionProps) => (
  <section aria-label="Order items" className="divide-y divide-border">
    {combos.map((line, index) => (
      <article
        key={comboLineKey(line)}
        className="grid grid-cols-[64px_minmax(0,1fr)_auto] gap-3 py-5"
      >
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#f3dfb9] text-xs font-extrabold text-[#8b4b24]">
          SET
        </div>
        <div className="min-w-0">
          <h2 className="font-bold">{line.combo.name}</h2>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            {line.selections.reduce(
              (sum, selection) => sum + selection.optionIds.length,
              0,
            )}{" "}
            selected components
          </p>
          <span className="mt-2 block text-xs font-bold text-text-primary">
            Price confirmed at checkout
          </span>
        </div>
        <div className="flex flex-col items-end justify-between gap-3">
          <div className="flex items-center gap-1 rounded-full bg-surface-secondary p-1">
            <IconButton
              aria-label={`Decrease ${line.combo.name}`}
              icon={Minus}
              size="sm"
              onClick={() => onComboChange(index, -1)}
            />
            <span className="w-6 text-center text-xs font-bold">
              {line.quantity}
            </span>
            <IconButton
              aria-label={`Increase ${line.combo.name}`}
              icon={Plus}
              size="sm"
              variant="primary"
              onClick={() => onComboChange(index, 1)}
            />
          </div>
        </div>
      </article>
    ))}

    {cart.map((line, index) => {
      const image = line.item.imageUrl ?? line.item.images[0]?.url;
      const choices = lineChoices(line);
      const key = `${line.item.id}-${line.variantId ?? "base"}-${line.selectedOptions
        .map(
          (option) =>
            `${option.optionId}:${option.zoneLabel ?? "WHOLE"}:${option.quantity}`,
        )
        .join(",")}`;
      return (
        <article
          key={key}
          className="grid grid-cols-[72px_minmax(0,1fr)_auto] gap-3 py-5"
        >
          {image ? (
            <img
              src={image}
              alt={line.item.name}
              className="h-[72px] w-[72px] rounded-2xl object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="grid h-[72px] w-[72px] place-items-center rounded-2xl bg-[#f3dfb9] text-[#8b4b24]">
              <Utensils className="h-6 w-6" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="font-bold leading-tight">{line.item.name}</h2>
            {choices && (
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-text-secondary">
                {choices}
              </p>
            )}
            <button
              type="button"
              onClick={() => onEdit(index)}
              className="mt-2 block text-xs font-extrabold text-primary"
            >
              Edit choices
            </button>
          </div>
          <div className="flex flex-col items-end justify-between gap-3">
            <strong className="text-sm">
              {formatMoney(getLineSubtotal(line))}
            </strong>
            <div className="flex items-center gap-1 rounded-full bg-surface-secondary p-1">
              <IconButton
                aria-label={`Decrease ${line.item.name}`}
                icon={Minus}
                size="sm"
                onClick={() => onChange(index, -1)}
              />
              <span className="w-6 text-center text-xs font-bold">
                {line.quantity}
              </span>
              <IconButton
                aria-label={`Increase ${line.item.name}`}
                icon={Plus}
                size="sm"
                variant="primary"
                onClick={() => onChange(index, 1)}
              />
            </div>
          </div>
        </article>
      );
    })}
  </section>
);
