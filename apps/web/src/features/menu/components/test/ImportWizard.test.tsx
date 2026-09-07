import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  validateMutate: vi.fn(),
  validatePending: false,
  commitMutate: vi.fn(),
  commitPending: false,
  template: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock("@/features/menu/hooks/useMenuImport", () => ({
  useValidateMenuImport: () => ({
    mutate: h.validateMutate,
    isPending: h.validatePending,
  }),
  useCommitMenuImport: () => ({
    mutate: h.commitMutate,
    isPending: h.commitPending,
  }),
}));
vi.mock("@/features/menu/services/menu-import.service", async () => {
  const actual = await vi.importActual<any>(
    "@/features/menu/services/menu-import.service",
  );
  return {
    ...actual,
    menuImportService: {
      ...actual.menuImportService,
      downloadTemplate: h.template,
    },
  };
});
vi.mock("@/shared/lib/notify", () => ({ notifyError: h.notifyError }));
vi.mock("@pos/ui", () => ({
  Button: ({ children, loading: _loading, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  IconButton: ({ icon: _icon, ...props }: any) => <button {...props} />,
  Dialog: ({ open, title, children, footer }: any) =>
    open ? (
      <div role="dialog">
        <h2>{title}</h2>
        {children}
        {footer}
      </div>
    ) : null,
  Table: ({ data }: any) => (
    <div>
      {data.map((row: any) => (
        <div key={row.row}>{row.data.name}</div>
      ))}
    </div>
  ),
}));

import { ImportWizard } from "../ImportWizard";

describe("ImportWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.validatePending = false;
    h.commitPending = false;
    h.template.mockResolvedValue(undefined);
  });

  it("validates, previews, commits, removes files and reports template failures", async () => {
    const onClose = vi.fn();
    h.validateMutate.mockImplementation((_file: any, opts: any) =>
      opts?.onSuccess?.({
        totalRows: 2,
        validCount: 1,
        preview: [
          {
            row: 1,
            action: "insert",
            data: {
              name: "Latte",
              categoryId: "c1",
              basePrice: "99",
              sku: null,
              status: "ACTIVE",
            },
          },
        ],
        errors: [{ row: 2, field: "name", message: "Required" }],
      }),
    );
    h.commitMutate.mockImplementation((_file: any, opts: any) =>
      opts?.onSuccess?.({ inserted: 1, updated: 0 }),
    );

    const { container } = render(<ImportWizard onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /CSV template/ }));
    expect(h.template).toHaveBeenCalledWith("csv");
    h.template.mockRejectedValueOnce(new Error("nope"));
    fireEvent.click(screen.getByRole("button", { name: /Excel template/ }));
    await waitFor(() =>
      expect(h.notifyError).toHaveBeenCalledWith(
        undefined,
        "Failed to download template",
      ),
    );

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(["name"], "menu.csv", { type: "text/csv" });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText("Latte")).toBeTruthy());
    expect(screen.getByText(/Row 2 \(name\): Required/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Import 1 item/ }));
    expect(h.commitMutate).toHaveBeenCalledWith(file, expect.anything());
    expect(onClose).toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText("Remove file"));
    expect(screen.getByText(/Click to upload/)).toBeTruthy();
  });

  it("handles validation failure and zero-valid import state", async () => {
    const onClose = vi.fn();
    h.validateMutate.mockImplementation((_file: any, opts: any) =>
      opts?.onError?.(new Error("bad")),
    );
    const { container, rerender } = render(<ImportWizard onClose={onClose} />);
    let input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["x"], "bad.csv")] },
    });
    await waitFor(() =>
      expect(screen.getByText(/Click to upload/)).toBeTruthy(),
    );

    h.validateMutate.mockImplementation((_file: any, opts: any) =>
      opts?.onSuccess?.({
        totalRows: 1,
        validCount: 0,
        preview: [],
        errors: [{ row: 1, message: "bad" }],
      }),
    );
    rerender(<ImportWizard onClose={onClose} />);
    input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["x"], "zero.csv")] },
    });
    await waitFor(() =>
      expect(screen.getByText(/0 ready to import/)).toBeTruthy(),
    );
    expect(
      (
        screen.getByRole("button", {
          name: /Import 0 item/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});
