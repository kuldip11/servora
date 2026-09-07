import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@pos/ui", () => ({
  IconButton: ({ "aria-label": label, onClick }: any) => (
    <button aria-label={label} onClick={onClick}>
      {label}
    </button>
  ),
}));
vi.mock("../FoodTypeDot", () => ({ FoodTypeDot: () => <span>food-dot</span> }));
vi.mock("../PublishBadge", () => ({
  PublishBadge: ({ isPublished }: any) => (
    <span>{isPublished ? "published" : "draft"}</span>
  ),
}));
vi.mock("../StatusBadge", () => ({
  StatusBadge: ({ status }: any) => <span>{status}</span>,
}));
import { MenuItemCard } from "../MenuItemCard";
const item = (over: any = {}) =>
  ({
    id: "i1",
    name: "Pizza",
    description: "Good",
    basePrice: "100",
    taxRate: "5",
    foodType: "VEG",
    spiceLevel: "MEDIUM",
    status: "ACTIVE",
    isPublished: false,
    manualOverrideStatus: null,
    manualOverrideReason: null,
    availabilityReason: null,
    variants: [],
    tagLinks: [],
    ...over,
  }) as any;
describe("MenuItemCard", () => {
  it("owns edit activation and item actions without bubbling", () => {
    const p = {
      onActivate: vi.fn(),
      onPublish: vi.fn(),
      onToggleAvailability: vi.fn(),
      onManualOverride: vi.fn(),
      onDuplicate: vi.fn(),
      onDelete: vi.fn(),
    };
    render(
      <MenuItemCard
        item={item()}
        selectMode={false}
        isSelected={false}
        {...p}
      />,
    );
    fireEvent.keyDown(screen.getByRole("button", { name: "Edit Pizza" }), {
      key: "Enter",
    });
    expect(p.onActivate).toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Publish (make live)" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Manually mark out of stock" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Duplicate item" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete item" }));
    expect(p.onPublish).toHaveBeenCalled();
    expect(p.onManualOverride).toHaveBeenCalled();
    expect(p.onDuplicate).toHaveBeenCalled();
    expect(p.onDelete).toHaveBeenCalled();
  });
  it("owns selection and manual-override presentation", () => {
    const activate = vi.fn(),
      toggle = vi.fn();
    render(
      <MenuItemCard
        item={item({
          isPublished: true,
          manualOverrideStatus: "INACTIVE",
          manualOverrideReason: "Sold out",
          variants: [{ price: "80" }, { price: "120" }],
          tagLinks: [{ tagId: "t1", tag: { name: "Popular", color: null } }],
        })}
        selectMode
        isSelected
        onActivate={activate}
        onPublish={vi.fn()}
        onToggleAvailability={toggle}
        onManualOverride={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(
      screen
        .getByRole("button", { name: "Pizza, selected" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getByText("Manual override")).toBeTruthy();
    expect(screen.getByText("Sold out")).toBeTruthy();
    expect(screen.getByText("Popular")).toBeTruthy();
  });
});
