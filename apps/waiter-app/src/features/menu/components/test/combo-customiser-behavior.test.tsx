import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@pos/ui", () => ({
  BottomSheet: ({ children, footer, title, description, onClose }: any) => (
    <section>
      <h2>{title}</h2>
      <p>{description}</p>
      <button onClick={onClose}>Close sheet</button>
      {children}
      {footer}
    </section>
  ),
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

import { ComboCustomiser } from "@/features/menu/components/ComboCustomiser";

const combo: any = {
  id: "combo-1",
  name: "Lunch Combo",
  description: null,
  basePrice: 200,
  slots: [
    {
      id: "slot-2",
      name: "Drink",
      minSelections: 1,
      maxSelections: 2,
      sortOrder: 2,
      options: [
        { id: "opt-missing", menuItemId: "missing", upcharge: "0" },
        { id: "opt-drink", menuItemId: "drink", upcharge: "10" },
      ],
    },
    {
      id: "slot-1",
      name: "Main",
      minSelections: 1,
      maxSelections: 1,
      sortOrder: 1,
      options: [
        { id: "opt-main", menuItemId: "main", variantId: "v2", upcharge: 0 },
      ],
    },
  ],
};

const menuById = new Map<string, any>([
  [
    "main",
    {
      id: "main",
      name: "Burger",
      basePrice: 150,
      variants: [{ id: "v2", name: "Large", price: 175 }],
    },
  ],
  ["drink", { id: "drink", name: "Cola", basePrice: 50 }],
]);

describe("ComboCustomiser coverage", () => {
  it("renders sorted slots, variants, upcharges and invalid selection state", () => {
    const onToggle = vi.fn();
    const onAdd = vi.fn();
    const onClose = vi.fn();
    render(
      <ComboCustomiser
        combo={combo}
        menuById={menuById}
        selections={[]}
        onToggle={onToggle}
        onAdd={onAdd}
        onClose={onClose}
      />,
    );

    expect(
      screen.getByText(
        "Complete each combo choice before adding it to the order.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Step 1: Main")).toBeTruthy();
    expect(screen.getByText("Burger · Large")).toBeTruthy();
    expect(screen.getByText("+₹10.00 upcharge")).toBeTruthy();
    expect(screen.queryByText("missing")).toBeNull();
    expect(
      (screen.getByRole("button", { name: /Add combo/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /Burger/ }));
    expect(onToggle).toHaveBeenCalledWith("slot-1", "opt-main");
    fireEvent.click(screen.getByRole("button", { name: "Close sheet" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("enables add when every slot is valid and covers checked styling", () => {
    const onAdd = vi.fn();
    const { container } = render(
      <ComboCustomiser
        combo={{ ...combo, description: "Pick one main and a drink" }}
        menuById={menuById}
        selections={[
          { slotId: "slot-1", optionIds: ["opt-main"] },
          { slotId: "slot-2", optionIds: ["opt-drink"] },
        ]}
        onToggle={vi.fn()}
        onAdd={onAdd}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Pick one main and a drink")).toBeTruthy();
    expect(screen.getByText("Choose 1–2")).toBeTruthy();
    expect(screen.getByText("Choose 1")).toBeTruthy();
    const add = screen.getByRole("button", { name: /Add combo/ });
    expect((add as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(add);
    expect(onAdd).toHaveBeenCalled();
    expect(container.querySelector(".border-primary")).toBeTruthy();
  });
});
