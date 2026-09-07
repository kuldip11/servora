import { Minus, Plus } from "lucide-react";

type CustomerCustomizeScreenProps = {
  largeSize: boolean;
  quantity: number;
  extras: Record<string, boolean>;
  customizedPrice: number;
  onLargeSizeChange: (value: boolean) => void;
  onToggleExtra: (label: string, index: number) => void;
  onQuantityChange: (value: number) => void;
  onClose: () => void;
  onAddToOrder: () => void;
};

const sizes = [
  { label: "Regular · 10 inch", price: "₹560", isLarge: false },
  { label: "Large · 13 inch", price: "+ ₹170", isLarge: true },
];
const extraOptions = [
  "Extra mushrooms · + ₹60",
  "Chilli oil · + ₹30",
  "Gluten-free crust · + ₹90",
];

export const CustomerCustomizeScreen = ({
  largeSize,
  quantity,
  extras,
  customizedPrice,
  onLargeSizeChange,
  onToggleExtra,
  onQuantityChange,
  onClose,
  onAddToOrder,
}: CustomerCustomizeScreenProps) => (
  <div className="flex h-full flex-col">
    <div className="bg-[#174e36] px-4 pb-6 pt-9 text-white">
      <button
        type="button"
        onClick={onClose}
        className="rounded-full bg-white/15 px-3 py-1 text-xs"
      >
        Close
      </button>
      <div className="mx-auto mt-2 h-24 w-36 rounded-full bg-gradient-to-br from-[#f1d28e] to-[#b76532]" />
    </div>

    <div className="flex-1 overflow-y-auto rounded-t-[26px] bg-[#f6f2e8] px-4 pb-24 pt-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <h3 className="font-serif text-2xl font-bold">Truffle mushroom pizza</h3>
      <p className="mt-2 text-[10px] leading-5 text-[#6d756f]">
        Stone-baked crust, roasted mushrooms, mozzarella and fragrant thyme.
      </p>
      <div className="mt-5 flex justify-between text-xs font-bold">
        <span>Choose your size</span>
        <span className="text-[#e66a2c]">REQUIRED</span>
      </div>
      {sizes.map(({ label, price, isLarge }) => {
        const active = largeSize === isLarge;
        return (
          <button
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onLargeSizeChange(isLarge)}
            key={label}
            className="flex w-full items-center gap-3 border-b border-[#ddd8cd] py-3 text-xs"
          >
            <span
              className={`grid size-5 place-items-center rounded-full border-2 ${
                active ? "border-[#174e36]" : "border-[#c9c5bc]"
              }`}
            >
              {active && (
                <span className="size-2.5 rounded-full bg-[#174e36]" />
              )}
            </span>
            <span>{label}</span>
            <span className="ml-auto text-[#6d756f]">{price}</span>
          </button>
        );
      })}

      <div className="mt-5 flex justify-between text-xs font-bold">
        <span>Add something extra</span>
        <span className="text-[#6d756f]">OPTIONAL</span>
      </div>
      {extraOptions.map((label, index) => (
        <button
          type="button"
          aria-pressed={Boolean(extras[label])}
          onClick={() => onToggleExtra(label, index)}
          key={label}
          className="flex w-full items-center gap-3 border-b border-[#ddd8cd] py-3 text-left text-xs"
        >
          <span
            className={`size-5 rounded-full border-2 ${
              extras[label]
                ? "border-[#174e36] bg-[#174e36] shadow-[inset_0_0_0_4px_white]"
                : "border-[#c9c5bc]"
            }`}
          />
          {label}
        </button>
      ))}
    </div>

    <div className="absolute inset-x-0 bottom-0 flex gap-2 border-t border-[#ddd8cd] bg-[#fffdf8] p-3">
      <div className="flex items-center gap-3 rounded-xl bg-[#eee9de] px-2 text-xs font-bold">
        <button
          type="button"
          aria-label="Decrease quantity"
          disabled={quantity === 1}
          onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
          className="grid size-7 place-items-center disabled:opacity-35"
        >
          <Minus size={12} />
        </button>
        {quantity}
        <button
          type="button"
          aria-label="Increase quantity"
          onClick={() => onQuantityChange(quantity + 1)}
          className="grid size-7 place-items-center"
        >
          <Plus size={12} />
        </button>
      </div>
      <button
        type="button"
        onClick={onAddToOrder}
        className="flex-1 rounded-xl bg-[#174e36] py-3 text-xs font-bold text-white"
      >
        Add to order · ₹{customizedPrice}
      </button>
    </div>
  </div>
);
