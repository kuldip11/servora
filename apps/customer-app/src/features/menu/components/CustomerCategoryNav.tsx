type Category = { id: string; name: string };

type CustomerCategoryNavProps = {
  categories: Category[];
  activeCategory: string;
  onSelect: (category: Category) => void;
};

export const CustomerCategoryNav = ({
  categories,
  activeCategory,
  onSelect,
}: CustomerCategoryNavProps) => (
  <nav
    aria-label="Menu categories"
    className="sticky top-0 z-20 border-b border-border/70 bg-background/95 backdrop-blur-xl"
  >
    <div className="customer-scrollbar-hidden mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
      {categories.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onSelect(option)}
          aria-current={activeCategory === option.name ? "page" : undefined}
          className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-colors ${
            activeCategory === option.name
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-surface text-text-secondary hover:border-primary/40 hover:text-text-primary"
          }`}
        >
          {option.name}
        </button>
      ))}
    </div>
  </nav>
);
