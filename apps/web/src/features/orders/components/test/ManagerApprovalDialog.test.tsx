import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  approve: vi.fn(),
  toast: vi.fn(),
  extract: vi.fn(),
}));

vi.mock("@/shared/lib/api-client", () => ({
  apiClient: {},
  extractApiError: mocks.extract,
}));
vi.mock("@pos/api-client", () => ({
  createApprovalsApi: () => ({ requestManagerApproval: mocks.approve }),
}));
vi.mock("@pos/ui", () => ({
  Modal: ({ open, title, children }: any) =>
    open ? (
      <div role="dialog">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
  Button: ({ children, loading: _loading, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  Input: ({ label, ...props }: any) => (
    <label>
      {label}
      <input aria-label={label} {...props} />
    </label>
  ),
  toast: mocks.toast,
}));

import { ManagerApprovalDialog } from "../ManagerApprovalDialog";

describe("ManagerApprovalDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.approve.mockResolvedValue({ token: "tok" });
    mocks.extract.mockReturnValue("approval failed");
  });

  it("approves void/comp requests and handles null/error branches", async () => {
    const approved = vi.fn();
    const request = {
      action: "void",
      itemId: "i1",
      reason: { reason: "x" },
    } as never;
    const { rerender } = render(
      <ManagerApprovalDialog
        open
        orderId="o1"
        request={request}
        onClose={vi.fn()}
        onApproved={approved}
      />,
    );
    const button = screen.getByRole("button", { name: "Approve and continue" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Manager email"), {
      target: { value: " boss@x.com " },
    });
    fireEvent.change(screen.getByLabelText("Manager password"), {
      target: { value: "pw" },
    });
    fireEvent.click(button);
    await waitFor(() =>
      expect(mocks.approve).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: "VOID",
          managerEmail: "boss@x.com",
        }),
      ),
    );
    expect(approved).toHaveBeenCalledWith("tok");

    mocks.approve.mockRejectedValueOnce(new Error("bad"));
    rerender(
      <ManagerApprovalDialog
        open
        orderId="o1"
        request={{ ...(request as object), action: "comp" } as never}
        onClose={vi.fn()}
        onApproved={approved}
      />,
    );
    fireEvent.change(screen.getByLabelText("Manager password"), {
      target: { value: "pw2" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Approve and continue" }),
    );
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith({
        title: "approval failed",
        tone: "danger",
      }),
    );

    rerender(
      <ManagerApprovalDialog
        open
        orderId="o1"
        request={null}
        onClose={vi.fn()}
        onApproved={approved}
      />,
    );
    fireEvent.change(screen.getByLabelText("Manager email"), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByLabelText("Manager password"), {
      target: { value: "pw" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Approve and continue" }),
    );
    expect(mocks.approve).toHaveBeenCalledTimes(2);
  });
});
