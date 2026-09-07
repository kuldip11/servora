import { ChevronRight, Search } from "lucide-react";

type CustomerMenuScreenProps = {
  menuQuery: string;
  menuCategory: string;
  onMenuQueryChange: (value: string) => void;
  onMenuCategoryChange: (value: string) => void;
  onCustomize: () => void;
  onViewCart: () => void;
};

const categories = ["For you", "Starters", "Mains", "Drinks"];
const sharingItems = [
  {
    name: "Truffle mushroom pizza",
    description: "Roasted mushrooms and mozzarella",
    price: "₹560",
    gradient: "from-[#edca7e] to-[#c66f31]",
  },
  {
    name: "Garden mezze",
    description: "Hummus, labneh and warm pita",
    price: "₹380",
    gradient: "from-[#dce6bd] to-[#789756]",
  },
];

export const CustomerMenuScreen = ({
  menuQuery,
  menuCategory,
  onMenuQueryChange,
  onMenuCategoryChange,
  onCustomize,
  onViewCart,
}: CustomerMenuScreenProps) => (
  <div className="h-full overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <header className="bg-gradient-to-br from-[#123f2c] to-[#236c4a] px-4 pb-4 pt-8 text-white">
      <p className="text-[9px] font-bold uppercase tracking-[0.16em] opacity-70">
        Welcome to
      </p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <h3 className="font-serif text-2xl font-bold">Olive &amp; Ember</h3>
        <span className="rounded-full border border-white/25 bg-white/10 px-2 py-1 text-[9px] font-bold">
          Table 12
        </span>
      </div>
      <p className="mt-1 text-[10px] opacity-75">
        Good evening — order whenever you&apos;re ready.
      </p>
      <label className="mt-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-[10px] text-[#6d756f]">
        <Search size={13} />
        <input
          value={menuQuery}
          onChange={(event) => onMenuQueryChange(event.target.value)}
          placeholder="Search dishes, drinks or ingredients"
          className="min-w-0 flex-1 bg-transparent text-[10px] text-[#172019] outline-none placeholder:text-[#8a948d]"
        />
      </label>
    </header>

    <div className="flex gap-1.5 overflow-hidden px-3 py-3">
      {categories.map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={menuCategory === item}
          onClick={() => onMenuCategoryChange(item)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[9px] font-bold transition ${
            menuCategory === item
              ? "bg-[#174e36] text-white"
              : "border border-[#ddd8cd] bg-white"
          }`}
        >
          {item}
        </button>
      ))}
    </div>

    <main className="px-3 pb-24">
      {(menuQuery || menuCategory !== "For you") && (
        <div className="mb-3 rounded-xl bg-[#e1eee5] px-3 py-2 text-[9px] font-bold text-[#174e36]">
          Showing {menuCategory === "For you" ? "all categories" : menuCategory}
          {menuQuery ? ` matching “${menuQuery}”` : ""}
        </div>
      )}
      <h4 className="font-serif text-xl font-bold">Popular tonight</h4>
      <button
        type="button"
        onClick={onCustomize}
        className="relative mt-2 h-36 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#e46b31] to-[#8b321b] p-4 text-left text-white"
      >
        <span className="rounded-full bg-white/15 px-2 py-1 text-[8px] font-bold">
          BEST SELLER
        </span>
        <strong className="mt-3 block max-w-[65%] font-serif text-xl leading-tight">
          Smoky paneer bowl
        </strong>
        <span className="mt-1 block max-w-[70%] text-[9px] opacity-80">
          Charred peppers, saffron rice, herb yogurt
        </span>
        <span className="absolute bottom-4 left-4 text-sm font-bold">₹420</span>
        <span className="absolute bottom-4 right-4 grid size-9 place-items-center rounded-full bg-white text-lg text-[#8b321b]">
          +
        </span>
      </button>

      <h4 className="mt-5 font-serif text-lg font-bold">Made for sharing</h4>
      {sharingItems.map(({ name, description, price, gradient }) => (
        <button
          key={name}
          type="button"
          onClick={onCustomize}
          className="mt-2 grid w-full grid-cols-[64px_1fr_30px] items-center gap-3 rounded-2xl border border-[#ddd8cd] bg-white p-2 text-left"
        >
          <span className={`h-16 rounded-xl bg-gradient-to-br ${gradient}`} />
          <span>
            <strong className="block text-xs">{name}</strong>
            <span className="mt-1 block text-[9px] text-[#6d756f]">
              {description}
            </span>
            <span className="mt-2 block text-[10px] font-bold">{price}</span>
          </span>
          <span className="grid size-7 place-items-center rounded-full bg-[#174e36] text-white">
            +
          </span>
        </button>
      ))}
    </main>

    <button
      type="button"
      onClick={onViewCart}
      className="absolute inset-x-3 bottom-3 flex h-14 items-center justify-between rounded-2xl bg-[#174e36] px-4 text-xs font-bold text-white shadow-xl"
    >
      <span>2 items</span>
      <span>
        View order · ₹980 <ChevronRight className="inline" size={14} />
      </span>
    </button>
  </div>
);
