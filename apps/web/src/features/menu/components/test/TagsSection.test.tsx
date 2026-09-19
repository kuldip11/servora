import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  tags: [] as any[],
  addTag: vi.fn(),
  delTag: vi.fn(),
}));
vi.mock("@/features/menu/hooks/useMenuTags", () => ({
  useMenuTags: () => ({
    data: h.tags,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}));
vi.mock("@/features/menu/hooks/useAddMenuTag", () => ({
  useAddMenuTag: () => ({ isPending: false, mutateAsync: h.addTag }),
}));
vi.mock("@/features/menu/hooks/useDeleteMenuTag", () => ({
  useDeleteMenuTag: () => ({ mutate: h.delTag }),
}));
vi.mock("@pos/ui", () => ({
  FormErrorSummary: ({ messages = [] }: any) =>
    messages.length ? <div role="alert">{messages.join(" ")}</div> : null,
  QueryErrorState: ({ title, onRetry }: any) => (
    <div role="alert">
      {title}
      {onRetry ? <button onClick={onRetry}>Retry</button> : null}
    </div>
  ),
  StaleDataBanner: ({ message }: any) => <div role="status">{message}</div>,
  FieldErrorText: ({ id, message }: any) =>
    message ? <span id={id}>{message}</span> : null,
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
    h.addTag.mockResolvedValue({});
    const { rerender } = render(<TagsSection />);
    fireEvent.click(screen.getAllByRole("button", { name: /Choose/ })[1]!);
    fireEvent.change(screen.getByLabelText("New tag"), {
      target: { value: "Chef" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Create tag" }).closest("form")!,
    );
    await waitFor(() => expect(h.addTag).toHaveBeenCalled());
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByLabelText("Delete tag Hot"));
    expect(h.delTag).toHaveBeenCalledWith("t1");

    h.tags = [];
    rerender(<TagsSection />);
    expect(screen.getByText(/No tags yet/)).toBeTruthy();
  });
});
