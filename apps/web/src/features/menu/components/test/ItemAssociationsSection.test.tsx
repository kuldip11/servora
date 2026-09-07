import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@pos/ui", () => ({
  Button: ({ children, loading: _loading, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  Card: ({ children, ...props }: any) => (
    <section {...props}>{children}</section>
  ),
  IconButton: ({ icon: Icon, ...props }: any) => (
    <button {...props}>
      <Icon />
    </button>
  ),
  Input: ({ label, error, ...props }: any) => (
    <label>
      {label}
      <input aria-label={label} {...props} />
      {error ? <span>{error}</span> : null}
    </label>
  ),
  Modal: ({ open, title, children }: any) =>
    open ? (
      <div role="dialog">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
  Select: ({ label, options = [], ...props }: any) => (
    <label>
      {label}
      <select aria-label={label} {...props}>
        {options.map((o: any) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  ),
}));

import { ItemAssociationsSection } from "../forms/ItemAssociationsSection";

describe("ItemAssociationsSection", () => {
  it("toggles modifier groups, tags and allergens", () => {
    const toggle = vi.fn();
    render(
      <ItemAssociationsSection
        groups={[{ id: "g1", name: "Milk" } as any]}
        tags={[{ id: "t1", name: "Veg", color: null } as any]}
        allergens={[{ id: "a1", name: "Nuts" } as any]}
        selectedGroupIds={["g1"]}
        selectedTagIds={[]}
        selectedAllergenIds={["a1"]}
        toggle={toggle}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Milk" }));
    fireEvent.click(screen.getByRole("button", { name: "Veg" }));
    fireEvent.click(screen.getByRole("button", { name: "Nuts" }));
    expect(toggle).toHaveBeenCalledTimes(3);
  });
});
