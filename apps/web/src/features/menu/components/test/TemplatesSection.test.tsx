import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  deleteMutate: vi.fn(), applyMutate: vi.fn(), saveMutate: vi.fn(), success: vi.fn(),
}));
let templates: any[] | undefined = [];
let loading = false;

vi.mock("@pos/ui", () => ({
  Button: ({ children, loading: _loading, ...props }: any) => <button {...props}>{children}</button>,
  Modal: ({ open, title, children, onClose }: any) => open ? <div role="dialog"><h2>{title}</h2><button aria-label="modal-close" onClick={onClose}>x</button>{children}</div> : null,
  Input: ({ label, error, ...props }: any) => <label>{label}<input aria-label={label} {...props}/>{error ? <span>{error}</span> : null}</label>,
}));
vi.mock("@/features/menu/hooks/useMenuTemplates", () => ({ useMenuTemplates: () => ({ data: templates, isLoading: loading }) }));
vi.mock("@/features/menu/hooks/useDeleteTemplate", () => ({ useDeleteTemplate: () => ({ mutate: h.deleteMutate }) }));
vi.mock("@/features/menu/hooks/useApplyTemplate", () => ({ useApplyTemplate: () => ({ mutate: h.applyMutate, isPending: false }) }));
vi.mock("@/features/menu/hooks/useSaveTemplateFromCategory", () => ({ useSaveTemplateFromCategory: () => ({ mutate: h.saveMutate, isPending: false }) }));
vi.mock("@/features/branches/hooks/useBranches", () => ({ useBranches: () => ({ data: [{ id: "b1", name: "Central" }] }) }));
vi.mock("@/shared/lib/notify", () => ({ notifySuccess: h.success }));

import { SaveTemplateModal, TemplatesSection } from "../TemplatesSection";

describe("TemplatesSection coverage", () => {
  beforeEach(() => { vi.clearAllMocks(); loading = false; templates = []; vi.stubGlobal("confirm", vi.fn(() => true)); });

  it("covers loading, empty, listing, delete cancellation and application", async () => {
    loading = true;
    const view = render(<TemplatesSection />);
    expect(screen.getByText("Loading…")).toBeTruthy();

    loading = false; templates = [];
    view.rerender(<TemplatesSection />);
    expect(screen.getByText("No templates saved yet.")).toBeTruthy();

    templates = [{ id: "t1", name: "Breakfast", description: "Morning set", sourceCategoryName: "Morning", items: [{ id: "i1" }, { id: "i2" }] }];
    view.rerender(<TemplatesSection />);
    expect(screen.getByText("Morning set")).toBeTruthy();

    (globalThis.confirm as any).mockReturnValueOnce(false);
    fireEvent.click(screen.getByLabelText("Delete template Breakfast"));
    expect(h.deleteMutate).not.toHaveBeenCalled();
    (globalThis.confirm as any).mockReturnValueOnce(true);
    fireEvent.click(screen.getByLabelText("Delete template Breakfast"));
    expect(h.deleteMutate).toHaveBeenCalledWith("t1");

    fireEvent.click(screen.getByRole("button", { name: /Apply/ }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("New category name"), { target: { value: "Brunch" } });
    fireEvent.change(screen.getByLabelText("Branch"), { target: { value: "b1" } });
    fireEvent.submit(screen.getAllByRole("button", { name: "Apply" }).at(-1)!.closest("form")!);
    await waitFor(() => expect(h.applyMutate).toHaveBeenCalled());
    const [arg, opts] = h.applyMutate.mock.calls[0];
    expect(arg).toEqual({ templateId: "t1", input: { branchId: "b1", categoryName: "Brunch" } });
    await act(async () => opts.onSuccess());
    expect(h.success).toHaveBeenCalledWith(expect.stringContaining("2 item(s) added as drafts"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("covers save template trimming, optional description and close paths", async () => {
    const onClose = vi.fn();
    const { rerender } = render(<SaveTemplateModal category={{ id: "c1", name: "Drinks" }} onClose={onClose} />);
    fireEvent.change(screen.getByLabelText("Template name"), { target: { value: "  Drinks Copy  " } });
    fireEvent.change(screen.getByLabelText("Description (optional)"), { target: { value: "  Portable drinks  " } });
    fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form")!);
    await waitFor(() => expect(h.saveMutate).toHaveBeenCalled());
    let [arg, opts] = h.saveMutate.mock.calls[0];
    expect(arg).toEqual({ categoryId: "c1", input: { name: "Drinks Copy", description: "Portable drinks" } });
    opts.onSuccess(); expect(onClose).toHaveBeenCalled();

    h.saveMutate.mockClear();
    rerender(<SaveTemplateModal category={{ id: "c1", name: "Drinks" }} onClose={onClose} />);
    fireEvent.change(screen.getByLabelText("Template name"), { target: { value: "Drinks" } });
    fireEvent.change(screen.getByLabelText("Description (optional)"), { target: { value: "   " } });
    fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form")!);
    await waitFor(() => expect(h.saveMutate).toHaveBeenCalled());
    [arg] = h.saveMutate.mock.calls[0];
    expect(arg.input).toEqual({ name: "Drinks" });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByLabelText("modal-close"));
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
