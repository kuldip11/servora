import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ItemCustomizationFooter } from "../ItemCustomizationFooter";
describe("ItemCustomizationFooter", () => {
  it("owns quantity controls and add/update action", () => {
    const onQuantityChange = vi.fn(),
      onAdd = vi.fn();
    const { rerender } = render(
      <ItemCustomizationFooter
        editing={false}
        quantity={1}
        total={12}
        valid
        onAdd={onAdd}
        onQuantityChange={onQuantityChange}
      />,
    );
    expect(
      (
        screen.getByRole("button", {
          name: "Decrease quantity",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    expect(onQuantityChange).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByRole("button", { name: /Add to order/ }));
    expect(onAdd).toHaveBeenCalled();
    rerender(
      <ItemCustomizationFooter
        editing
        quantity={2}
        total={12}
        valid={false}
        onAdd={onAdd}
        onQuantityChange={onQuantityChange}
      />,
    );
    expect(
      (
        screen.getByRole("button", {
          name: /Update order/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});
