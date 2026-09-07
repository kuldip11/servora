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

import { ItemMediaVariantsSection } from "../forms/ItemMediaVariantsSection";

describe("ItemMediaVariantsSection", () => {
  it("forwards image and variant callbacks", () => {
    const fns = Array.from({ length: 6 }, () => vi.fn());
    render(
      <ItemMediaVariantsSection
        imageUrls={["https://x.test/a.png"]}
        newImageUrl=""
        variants={[{ name: "Small", price: "10" }]}
        onNewImageUrl={fns[0]!}
        onAddImage={fns[1]!}
        onRemoveImage={fns[2]!}
        onVariantChange={fns[3]!}
        onRemoveVariant={fns[4]!}
        onAddVariant={fns[5]!}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText(/Paste an image URL/), {
      target: { value: "https://x.test/b.png" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(screen.getByLabelText("Remove image 1"));
    fireEvent.change(screen.getByLabelText("Variant 1 name"), {
      target: { value: "Large" },
    });
    fireEvent.change(screen.getByLabelText("Variant 1 price"), {
      target: { value: "20" },
    });
    fireEvent.click(screen.getByLabelText("Remove variant 1"));
    fireEvent.click(screen.getByRole("button", { name: "+ Add variant" }));
    fns.forEach((fn) => expect(fn).toHaveBeenCalled());
  });
});
