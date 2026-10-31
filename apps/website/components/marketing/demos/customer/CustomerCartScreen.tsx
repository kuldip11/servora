type CustomerCartScreenProps = {
  firstItemPrice: number;
  firstItemMeta: string;
  quantities: number[];
  couponApplied: boolean;
  subtotal: number;
  tax: number;
  onQuantityChange: (index: number, value: number) => void;
  onToggleCoupon: () => void;
  onBackToMenu: () => void;
  onEditChoices: () => void;
  onSubmit: () => void;
};

const cartItems = [
  {
    name: "Truffle mushroom pizza",
    meta: "Large · Extra mushrooms",
    price: 790,
  },
  { name: "Garden mezze", meta: "Warm pita · No olives", price: 380 },
];

export const CustomerCartScreen = ({
  firstItemPrice,
  firstItemMeta,
  quantities,
  couponApplied,
  subtotal,
  tax,
  onQuantityChange,
  onToggleCoupon,
  onBackToMenu,
  onEditChoices,
  onSubmit,
}: CustomerCartScreenProps) => (
  <div className="h-full overflow-y-auto px-4 pb-24 pt-9 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <button
      type="button"
      onClick={onBackToMenu}
      className="text-xs font-bold text-[#174e36]"
    >
      ← Menu
    </button>
    <h3 className="mt-2 font-sans text-2xl font-bold">Your order</h3>
    <div className="mt-3 flex justify-between rounded-sm bg-[#e1eee5] px-3 py-2 text-[12px] font-bold text-[#174e36]">
      <span>Table 12 · Dine in</span>
      <span>{quantities.reduce((sum, value) => sum + value, 0)} items</span>
    </div>

    {cartItems.map(({ name, meta, price }, index) => (
      <div
        key={name}
        className="grid grid-cols-[1fr_auto] gap-3 border-b border-[#ddd8cd] py-4"
      >
        <div>
          <strong className="block text-xs">{name}</strong>
          <span className="mt-1 block text-[12px] text-[#6d756f]">
            {index === 0 ? firstItemMeta : meta}
            <br />
            Eat here
          </span>
          <button
            type="button"
            onClick={onEditChoices}
            className="mt-2 text-[12px] font-bold text-[#174e36]"
          >
            Edit choices
          </button>
        </div>
        <div className="text-right">
          <strong className="text-[12px]">
            ₹
            {(
              (index === 0 ? firstItemPrice : price) * (quantities[index] ?? 1)
            ).toFixed(2)}
          </strong>
          <div className="mt-5 flex items-center gap-2 text-[12px]">
            <button
              type="button"
              aria-label={`Decrease ${name}`}
              disabled={(quantities[index] ?? 1) === 1}
              onClick={() =>
                onQuantityChange(
                  index,
                  Math.max(1, (quantities[index] ?? 1) - 1),
                )
              }
              className="grid size-6 place-items-center rounded-full bg-[#e7ede2] disabled:opacity-35"
            >
              −
            </button>
            {quantities[index] ?? 1}
            <button
              type="button"
              aria-label={`Increase ${name}`}
              onClick={() =>
                onQuantityChange(index, (quantities[index] ?? 1) + 1)
              }
              className="grid size-6 place-items-center rounded-full bg-[#e7ede2]"
            >
              +
            </button>
          </div>
        </div>
      </div>
    ))}

    <button
      type="button"
      onClick={onToggleCoupon}
      className="mt-4 w-full rounded-sm border border-dashed border-[#cfc9bd] px-3 py-3 text-left text-[12px] text-[#6d756f]"
    >
      {couponApplied ? "WELCOME10 reward applied" : "Add coupon or reward"}
      <span className="float-right font-bold text-[#174e36]">
        {couponApplied ? "Remove" : "Add →"}
      </span>
    </button>

    <div className="mt-5 space-y-2 text-[12px]">
      <div className="flex justify-between text-[#6d756f]">
        <span>Subtotal</span>
        <span>₹{subtotal.toFixed(0)}</span>
      </div>
      <div className="flex justify-between text-[#6d756f]">
        <span>Taxes</span>
        <span>₹{tax.toFixed(2)}</span>
      </div>
      {couponApplied && (
        <div className="flex justify-between font-bold text-[#174e36]">
          <span>Reward</span>
          <span>-₹{(subtotal * 0.1).toFixed(2)}</span>
        </div>
      )}
      <div className="flex justify-between pt-2 text-base font-bold">
        <span>Total</span>
        <span>
          ₹{(subtotal + tax - (couponApplied ? subtotal * 0.1 : 0)).toFixed(2)}
        </span>
      </div>
    </div>

    <button
      type="button"
      onClick={onSubmit}
      className="absolute inset-x-3 bottom-3 rounded-sm bg-[#174e36] py-4 text-xs font-bold text-white"
    >
      Send order to kitchen →
    </button>
  </div>
);
