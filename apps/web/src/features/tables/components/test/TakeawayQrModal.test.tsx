import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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

import { TakeawayQrModal } from "../TableQrDialogs";

describe("TakeawayQrModal", () => {
  it("renders disabled and enabled states", () => {
    const regenerate = vi.fn();
    const { rerender } = render(
      <TakeawayQrModal
        data={{
          branchId: "b",
          branchName: "Central",
          enabled: false,
          token: "take",
        }}
        open
        onClose={vi.fn()}
        onRegenerate={regenerate}
        busy={false}
      />,
    );
    expect(screen.getByText(/Takeaway ordering is disabled/)).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Print QR" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    rerender(
      <TakeawayQrModal
        data={{
          branchId: "b",
          branchName: "Central",
          enabled: true,
          token: "take",
        }}
        open
        onClose={vi.fn()}
        onRegenerate={regenerate}
        busy
      />,
    );
    expect(screen.getByTestId("qr").textContent).toContain("qr=take");
    expect(
      (screen.getByRole("button", { name: "Updating…" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
