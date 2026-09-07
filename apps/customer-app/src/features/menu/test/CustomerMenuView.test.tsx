import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@pos/ui", () => ({
  EmptyState: ({ title, description }: any) => (
    <div>
      {title}
      <span>{description}</span>
    </div>
  ),
}));
vi.mock("../components/CustomerMenuHeader", () => ({
  CustomerMenuHeader: ({ search, onSearchChange, onViewOrder }: any) => (
    <header>
      <button onClick={onViewOrder}>view-order</button>
      <input
        aria-label="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </header>
  ),
}));
vi.mock("../components/CustomerCategoryNav", () => ({
  CustomerCategoryNav: ({ categories, onSelect }: any) => (
    <nav>
      {categories.map((c: any) => (
        <button key={c.id} onClick={() => onSelect(c)}>
          {c.name}
        </button>
      ))}
    </nav>
  ),
}));
vi.mock("../components/CustomerMenuOverlays", () => ({
  CustomerMenuOverlays: ({ onCart, error, onDismissError }: any) => (
    <aside>
      <button onClick={onCart}>cart</button>
      {error ? <button onClick={onDismissError}>dismiss-error</button> : null}
    </aside>
  ),
}));
vi.mock("../components/PopularMenuSection", () => ({
  PopularMenuSection: () => <section>popular-section</section>,
}));
vi.mock("../components/ProgressiveMenuSection", () => ({
  ProgressiveMenuSection: ({ title, onActive }: any) => (
    <section>
      <span>{title}</span>
      {onActive ? <button onClick={onActive}>activate-{title}</button> : null}
    </section>
  ),
}));
import { CustomerMenuView } from "../CustomerMenuView";
const item = (id: string, categoryId = "c1", over: any = {}) =>
  ({ id, name: `Dish ${id}`, categoryId, tagLinks: [], ...over }) as any;
const base = (over: any = {}) => ({
  session: { mode: "DINE_IN", table: "7", area: "Patio", restaurant: "R" },
  placedOrder: false,
  itemCount: 0,
  total: 20,
  search: "",
  setSearch: vi.fn(),
  categories: [
    { id: "popular", name: "Popular" },
    { id: "c1", name: "Mains" },
  ],
  category: "Popular",
  setCategory: vi.fn(),
  combos: [],
  visibleItems: [item("1")],
  error: null,
  setError: vi.fn(),
  onViewOrder: vi.fn(),
  onCart: vi.fn(),
  onOpenCombo: vi.fn(),
  onOpenItem: vi.fn(),
  ...over,
});
beforeEach(() => {
  vi.clearAllMocks();
  window.requestAnimationFrame = (cb: any) => {
    cb(0);
    return 1;
  };
  document.getElementById("x") as any;
});
describe("CustomerMenuView", () => {
  it("orchestrates header, category navigation, overlays and category activation", () => {
    const p = base();
    render(<CustomerMenuView {...p} />);
    fireEvent.click(screen.getByText("view-order"));
    fireEvent.click(screen.getByText("cart"));
    fireEvent.change(screen.getByLabelText("search"), {
      target: { value: "pi" },
    });
    fireEvent.click(screen.getAllByText("Mains")[0]!);
    fireEvent.click(screen.getByText("activate-Mains"));
    expect(p.onViewOrder).toHaveBeenCalled();
    expect(p.onCart).toHaveBeenCalled();
    expect(p.setSearch).toHaveBeenCalled();
    expect(p.setCategory).toHaveBeenCalledWith("Mains");
  });
  it("selects search mode and empty state at the orchestrator boundary", () => {
    const { rerender } = render(
      <CustomerMenuView {...base({ search: "pizza" })} />,
    );
    expect(screen.getByText("“pizza”")).toBeTruthy();
    rerender(
      <CustomerMenuView {...base({ search: "none", visibleItems: [] })} />,
    );
    expect(screen.getByText("No dishes found")).toBeTruthy();
  });
  it("dismisses overlay errors through the parent callback", () => {
    const p = base({ error: "oops" });
    render(<CustomerMenuView {...p} />);
    fireEvent.click(screen.getByText("dismiss-error"));
    expect(p.setError).toHaveBeenCalledWith(null);
  });
});
