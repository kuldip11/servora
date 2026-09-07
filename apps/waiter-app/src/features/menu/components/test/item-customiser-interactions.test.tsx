import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@pos/ui", () => ({
  BottomSheet: ({ children, footer, title, onClose }: any) => (
    <section>
      <h2>{title}</h2>
      <button onClick={onClose}>sheet-close</button>
      {children}
      {footer}
    </section>
  ),
  Button: ({ children, onClick, disabled }: any) => (
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
  TextInput: ({ label, value, onChange, placeholder }: any) => (
    <label>
      {label}
      <input
        aria-label={label}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </label>
  ),
}));
vi.mock("@pos/validation", () => ({
  itemCustomizationSchema: {
    safeParse: (value: any) => ({ success: true, data: value }),
  },
}));

import { ItemCustomiser } from "@/features/menu/components/ItemCustomiser";

const base = {
  id: "m1",
  name: "Pizza",
  basePrice: 100,
  variants: [],
  modifierGroupLinks: [],
  pricingMode: "FIXED",
};

const group = (overrides: any = {}) => ({
  id: "g1",
  name: "Toppings",
  selectionType: "MULTIPLE",
  minSelections: 1,
  maxSelections: 2,
  options: [
    {
      id: "o1",
      name: "Cheese",
      additionalPrice: 10,
      maxQuantity: 3,
      isAvailable: true,
      variantPrices: [{ variantId: "v1", additionalPrice: 12 }],
    },
    {
      id: "o2",
      name: "Olive",
      additionalPrice: 0,
      maxQuantity: 1,
      isAvailable: true,
    },
    {
      id: "off",
      name: "Hidden",
      additionalPrice: 5,
      maxQuantity: 1,
      isAvailable: false,
    },
  ],
  ...overrides,
});

describe("ItemCustomiser interactions", () => {
  it("auto-confirms a simple item", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    const { container } = render(
      <ItemCustomiser
        item={base as any}
        onConfirm={onConfirm}
        onClose={onClose}
        courseMode
      />,
    );
    expect(container.innerHTML).toBe("");
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ menuItemId: "m1", course: 1, quantity: 1 }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("covers variants, multiple modifier selection, quantities, notes and course", () => {
    const onConfirm = vi.fn();
    const item: any = {
      ...base,
      variants: [
        { id: "v1", name: "Large", price: 120, status: "ACTIVE" },
        {
          id: "v2",
          name: "Sold",
          price: 130,
          status: "INACTIVE",
          manualStockCount: 0,
        },
      ],
      modifierGroupLinks: [{ group: group() }],
    };
    render(
      <ItemCustomiser
        item={item}
        onConfirm={onConfirm}
        onClose={vi.fn()}
        courseMode
      />,
    );
    fireEvent.click(screen.getByText("Large"));
    fireEvent.click(screen.getByText("Cheese"));
    const plusButtons = screen
      .getAllByRole("button")
      .filter((b) => b.innerHTML.includes("lucide-plus"));
    fireEvent.click(plusButtons[plusButtons.length - 1]!);
    fireEvent.click(screen.getByText("Olive"));
    fireEvent.change(screen.getByLabelText("Seat / diner (optional)"), {
      target: { value: "Seat 2" },
    });
    fireEvent.change(screen.getByLabelText("Note for Chef"), {
      target: { value: "crispy" },
    });
    fireEvent.click(screen.getByText("Main"));
    fireEvent.click(screen.getByText("Add to Order"));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        variantId: "v1",
        seatLabel: "Seat 2",
        chefNotes: "crispy",
        course: 2,
      }),
    );
  });

  it("covers weight and open pricing validation inputs", () => {
    const weightConfirm = vi.fn();
    const { unmount } = render(
      <ItemCustomiser
        item={{ ...base, pricingMode: "WEIGHT_BASED", weightUnit: "KG" } as any}
        onConfirm={weightConfirm}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/positive weight/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Weight (KG)"), {
      target: { value: "1.5" },
    });
    fireEvent.click(screen.getByText("Add to Order"));
    expect(weightConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        weightQuantity: 1.5,
        weightUnit: "KG",
        unitPrice: 150,
      }),
    );
    unmount();

    const openConfirm = vi.fn();
    render(
      <ItemCustomiser
        item={
          {
            ...base,
            pricingMode: "OPEN",
            openPriceMin: 10,
            openPriceMax: 20,
          } as any
        }
        onConfirm={openConfirm}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/manual price within/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Manual price"), {
      target: { value: "15" },
    });
    fireEvent.click(screen.getByText("Add to Order"));
    expect(openConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ manualPrice: 15, unitPrice: 15 }),
    );
  });

  it("covers zoned pricing and guided dependent groups", () => {
    const onConfirm = vi.fn();
    const dependent = group({
      id: "g2",
      name: "Sauce",
      selectionType: "SINGLE",
      minSelections: 0,
      maxSelections: 1,
      dependsOnOptionId: "o1",
      options: [
        {
          id: "s1",
          name: "Mint",
          additionalPrice: 5,
          maxQuantity: 1,
          isAvailable: true,
        },
      ],
    });
    const item: any = {
      ...base,
      supportsZones: true,
      zonePricingRule: "AVERAGE",
      displayMode: "GUIDED_BUILDER",
      modifierGroupLinks: [{ group: group() }, { group: dependent }],
    };
    render(
      <ItemCustomiser item={item} onConfirm={onConfirm} onClose={vi.fn()} />,
    );
    fireEvent.click(screen.getByText("Cheese"));
    fireEvent.click(screen.getByText("Right half"));
    fireEvent.click(screen.getByText("Cheese"));
    fireEvent.click(screen.getByText("Whole item"));
    fireEvent.click(screen.getByText("Cheese"));
    fireEvent.click(screen.getByText("Next step"));
    fireEvent.click(screen.getByText("Mint"));
    fireEvent.click(screen.getByText("Previous"));
    fireEvent.click(screen.getByText("Add to Order"));
    expect(onConfirm).toHaveBeenCalled();
  });
});
