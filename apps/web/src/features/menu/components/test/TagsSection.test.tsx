import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  tags: [] as any[],
  addTag: vi.fn(),
  delTag: vi.fn(),
}));
vi.mock("@/features/menu/hooks/useMenuTags", () => ({
  useMenuTags: () => ({ data: h.tags }),
}));
vi.mock("@/features/menu/hooks/useAddMenuTag", () => ({
  useAddMenuTag: () => ({ isPending: false, mutate: h.addTag }),
}));
vi.mock("@/features/menu/hooks/useDeleteMenuTag", () => ({
  useDeleteMenuTag: () => ({ mutate: h.delTag }),
}));
vi.mock("@pos/ui", () => ({
  Button: ({ children, loading: _loading, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  Input: ({ label, ...props }: any) => (
    <label>
      {label}
      <input aria-label={label} {...props} />
    </label>
  ),
}));

import { TagsSection } from "../TagsSection";

describe("TagsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.tags = [];
  });

  it("supports colors, add/reset, delete and empty state", async () => {
    h.tags = [{ id: "t1", name: "Hot", color: null }];
    h.addTag.mockImplementation((_value: any, options: any) =>
      options?.onSuccess?.(),
    );
    const { rerender } = render(<TagsSection />);
    fireEvent.click(screen.getAllByRole("button", { name: /Choose/ })[1]!);
    fireEvent.change(screen.getByLabelText("New tag"), {
      target: { value: "Chef" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "" }).closest("form")!);
    await waitFor(() => expect(h.addTag).toHaveBeenCalled());
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByLabelText("Delete tag Hot"));
    expect(h.delTag).toHaveBeenCalledWith("t1");

    h.tags = [];
    rerender(<TagsSection />);
    expect(screen.getByText(/No tags yet/)).toBeTruthy();
  });
});
