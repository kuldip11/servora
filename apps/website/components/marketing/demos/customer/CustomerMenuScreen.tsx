type Props = {
  menuQuery: string;
  menuCategory: string;
  onMenuQueryChange: (value: string) => void;
  onMenuCategoryChange: (value: string) => void;
  onCustomize: () => void;
  onViewCart: () => void;
  cartCount: number;
  cartSubtotal: number;
};
const dishes = [
  {
    name: "Truffle mushroom pizza",
    description: "Roasted mushrooms and mozzarella",
    price: 560,
    category: "Mains",
  },
  {
    name: "Garden mezze",
    description: "Hummus, labneh and warm pita",
    price: 380,
    category: "Starters",
  },
  {
    name: "Berry cooler",
    description: "Berries, lime and soda",
    price: 210,
    category: "Drinks",
  },
];
export function CustomerMenuScreen({
  menuQuery,
  menuCategory,
  onMenuQueryChange,
  onMenuCategoryChange,
  onCustomize,
  onViewCart,
  cartCount,
  cartSubtotal,
}: Props) {
  const visible = dishes.filter(
    (dish) =>
      (menuCategory === "For you" || dish.category === menuCategory) &&
      `${dish.name} ${dish.description}`
        .toLowerCase()
        .includes(menuQuery.toLowerCase()),
  );
  return (
    <div className="h-full overflow-y-auto px-4 pb-24 pt-5">
      <header>
        <p className="text-xs text-[#566052]">Olive &amp; Ember · Table 12</p>
        <h3 className="mt-2 text-2xl font-semibold">Your table. Your order.</h3>
        <label className="mt-5 block text-xs">
          Search demo menu
          <input
            aria-label="Search demo menu"
            value={menuQuery}
            onChange={(event) => onMenuQueryChange(event.target.value)}
            className="mt-2 w-full rounded-sm border border-[#83947b] bg-white p-3 text-sm"
            placeholder="Find a dish"
          />
        </label>
      </header>
      <div className="my-4 grid grid-cols-4 gap-1">
        {["For you", "Starters", "Mains", "Drinks"].map((category) => (
          <button
            key={category}
            type="button"
            aria-pressed={category === menuCategory}
            onClick={() => onMenuCategoryChange(category)}
            className={`min-h-11 rounded-sm px-1 py-2 text-xs ${category === menuCategory ? "bg-[#172019] text-white" : "bg-[#e7ede2] text-[#172019]"}`}
          >
            {category}
          </button>
        ))}
      </div>
      <h4 className="text-base font-semibold">
        {menuCategory === "For you" ? "The menu" : menuCategory}
      </h4>
      {visible.length === 0 ? (
        <p className="mt-6 text-sm">
          No dishes match. Try another search or category.
        </p>
      ) : (
        visible.map((dish) => (
          <article key={dish.name} className="border-b border-[#d5dece] py-5">
            <div className="flex justify-between gap-4">
              <strong className="text-sm">{dish.name}</strong>
              <span className="text-sm">₹{dish.price}</span>
            </div>
            <p className="mt-2 text-xs text-[#566052]">{dish.description}</p>
            {dish.name === "Truffle mushroom pizza" ? (
              <button
                type="button"
                onClick={onCustomize}
                className="mt-3 min-h-11 bg-[#172019] px-4 py-2 text-xs font-semibold text-white"
              >
                Customize pizza
              </button>
            ) : (
              <p className="mt-3 text-xs text-[#566052]">Menu preview</p>
            )}
          </article>
        ))
      )}
      <button
        type="button"
        onClick={onViewCart}
        className="absolute inset-x-3 bottom-3 flex min-h-12 items-center justify-between bg-[#172019] px-4 py-3 text-sm text-white"
      >
        <span>{cartCount} items</span>
        <span>View order · ₹{cartSubtotal.toFixed(2)}</span>
      </button>
    </div>
  );
}
