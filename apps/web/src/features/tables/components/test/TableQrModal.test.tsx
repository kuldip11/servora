import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: any) => <div data-testid="qr">{value}</div>,
}));
vi.mock("@/config/app-urls", () => ({
  appUrls: { customer: "https://customer.example/" },
}));
vi.mock("@pos/ui", () => ({
  Modal: ({ open, title, children, footer }: any) =>
    open ? (
      <div>
        <h2>{title}</h2>
        {children}
        {footer}
      </div>
    ) : null,
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

import { TableQrModal } from "../TableQrDialogs";

describe("TableQrModal", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders QR and supports regenerate/print actions", () => {
    const regenerate = vi.fn();
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    render(
      <TableQrModal
        table={
          {
            id: "t",
            name: "Table 1",
            section: "Main",
            capacity: 4,
            publicQrToken: "abc",
          } as any
        }
        open
        onClose={vi.fn()}
        onRegenerate={regenerate}
        regenerating={false}
      />,
    );
    expect(screen.getByTestId("qr").textContent).toContain(
      "https://customer.example/?qr=abc",
    );
    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));
    fireEvent.click(screen.getByRole("button", { name: "Print QR" }));
    expect(regenerate).toHaveBeenCalled();
    expect(print).toHaveBeenCalled();
  });
});
