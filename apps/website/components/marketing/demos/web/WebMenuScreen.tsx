type Props = {
  selectedItem: string | null;
  onSelect: (name: string) => void;
};

const items = [
  ["Truffle mushroom pizza", "Mains · ₹560", "Available"],
  ["Smoky paneer bowl", "Mains · ₹420", "Available"],
  ["Garden mezze", "Starters · ₹380", "Available"],
  ["Berry cooler", "Drinks · ₹220", "Low stock"],
] as const;

export const WebMenuScreen = ({ selectedItem, onSelect }: Props) => (
  <div className="mt-4 grid gap-3 sm:grid-cols-2">
    {items.map(([name, meta, status]) => (
      <button
        type="button"
        key={name}
        onClick={() => onSelect(name)}
        className={`rounded-xl border bg-white p-3 text-left ${selectedItem === name ? "border-[#174e36] ring-2 ring-[#dfeee4]" : "border-[#dfe6e1]"}`}
      >
        <strong className="block text-[9px]">{name}</strong>
        <span className="mt-1 block text-[7px] text-[#6e7a72]">{meta}</span>
        <span
          className={`mt-2 inline-block rounded-full px-2 py-1 text-[7px] font-bold ${status === "Available" ? "bg-[#e0eee5] text-[#23724d]" : "bg-[#fff0d7] text-[#a25b16]"}`}
        >
          {status}
        </span>
      </button>
    ))}
  </div>
);
