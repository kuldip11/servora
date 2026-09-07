import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  download: vi.fn(),
  downloadingKey: null as string | null,
}));

vi.mock("@/features/menu/hooks/useExportMenu", () => ({
  useExportMenu: () => ({
    download: h.download,
    downloadingKey: h.downloadingKey,
  }),
}));
vi.mock("@pos/ui", () => ({
  Popover: ({ trigger, children, open }: any) => (
    <div>
      {trigger}
      {open ? <div>{children}</div> : null}
    </div>
  ),
  Button: ({ children, loading: _loading, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

import { ExportMenu } from "../ExportMenu";

describe("ExportMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.downloadingKey = null;
    h.download.mockResolvedValue(undefined);
  });

  it("exports entities and formats, closes the popover, and renders busy state", async () => {
    const { rerender } = render(<ExportMenu />);
    fireEvent.click(screen.getByRole("button", { name: /Export/ }));
    expect(screen.getByText("Items")).toBeTruthy();
    expect(screen.getByText("Categories")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "csv" })[0]!);
    await waitFor(() =>
      expect(h.download).toHaveBeenCalledWith("items", "csv"),
    );
    expect(screen.queryByText("Items")).toBeNull();

    h.downloadingKey = "categories-xlsx";
    rerender(<ExportMenu />);
    fireEvent.click(screen.getByRole("button", { name: /Export/ }));
    expect(
      screen.getByRole("button", { name: "…" }).hasAttribute("disabled"),
    ).toBe(true);
  });
});
