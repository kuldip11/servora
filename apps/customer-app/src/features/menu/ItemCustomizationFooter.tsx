import { Minus, Plus } from "lucide-react";
import { Button, IconButton } from "@pos/ui";

import { formatMoney } from "@/shared/utils/money";

type Props = {
  editing: boolean;
  quantity: number;
  total: number;
  valid: boolean;
  onAdd: () => void;
  onQuantityChange: (quantity: number) => void;
};

export const ItemCustomizationFooter = ({
  editing,
  quantity,
  total,
  valid,
  onAdd,
  onQuantityChange,
}: Props) => (
  <div className="flex w-full items-center gap-3">
    <div className="flex h-12 shrink-0 items-center rounded-2xl bg-surface-secondary p-1">
      <IconButton
        aria-label="Decrease quantity"
        icon={Minus}
        size="sm"
        disabled={quantity <= 1}
        onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
      />
      <span className="w-8 text-center text-sm font-bold">{quantity}</span>
      <IconButton
        aria-label="Increase quantity"
        icon={Plus}
        size="sm"
        onClick={() => onQuantityChange(quantity + 1)}
      />
    </div>
    <Button
      size="lg"
      className="h-12 flex-1 rounded-2xl"
      disabled={!valid}
      onClick={onAdd}
    >
      {editing ? "Update order" : "Add to order"} · {formatMoney(total)}
    </Button>
  </div>
);
