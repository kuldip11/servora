import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requestManagerApproval: vi.fn(),
  toast: vi.fn(),
  extractApiError: vi.fn((error: unknown) =>
    error instanceof Error ? error.message : "Unknown error",
  ),
}));

vi.mock("@pos/api-client", () => ({
  createApprovalsApi: () => ({
    requestManagerApproval: mocks.requestManagerApproval,
  }),
  extractApiError: mocks.extractApiError,
}));
vi.mock("@pos/ui", () => ({
  toast: mocks.toast,
  Modal: ({ open, title, children }: any) =>
    open ? (
      <section>
        <h2>{title}</h2>
        {children}
      </section>
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
}));
vi.mock("@/shared/lib/api-client", () => ({ apiClient: {} }));

import {
  ManagerApprovalDialog,
  requestManagerApproval,
} from "@/features/orders/components/ManagerApprovalDialog";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ManagerApprovalDialog", () => {
  it("maps void and comp approvals and trims manager email", async () => {
    mocks.requestManagerApproval
      .mockResolvedValueOnce({ token: "void-token" })
      .mockResolvedValueOnce({ token: "comp-token" });
    await expect(
      requestManagerApproval({
        orderId: "o1",
        request: { action: "void", itemId: "i1", reason: {} },
        managerEmail: "  manager@example.com  ",
        password: "secret",
      }),
    ).resolves.toBe("void-token");
    expect(mocks.requestManagerApproval).toHaveBeenLastCalledWith({
      actionType: "VOID",
      orderId: "o1",
      orderItemId: "i1",
      managerEmail: "manager@example.com",
      password: "secret",
    });
    await expect(
      requestManagerApproval({
        orderId: "o2",
        request: { action: "comp", itemId: "i2", reason: {} },
        managerEmail: "boss@example.com",
        password: "pw",
      }),
    ).resolves.toBe("comp-token");
    expect(mocks.requestManagerApproval).toHaveBeenLastCalledWith({
      actionType: "COMP",
      orderId: "o2",
      orderItemId: "i2",
      managerEmail: "boss@example.com",
      password: "pw",
    });
  });

  it("handles approval success, missing request, close, and API failure", async () => {
    const onApproved = vi.fn();
    const onClose = vi.fn();
    const request = {
      action: "void" as const,
      itemId: "i1",
      reason: { reason: "mistake" },
    };
    mocks.requestManagerApproval.mockResolvedValueOnce({ token: "approved" });
    const { rerender } = render(
      <ManagerApprovalDialog
        open
        orderId="o1"
        request={request}
        onClose={onClose}
        onApproved={onApproved}
      />,
    );

    const approve = screen.getByRole("button", {
      name: "Approve and continue",
    });
    expect((approve as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Manager email"), {
      target: { value: "manager@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Manager password"), {
      target: { value: "secret" },
    });
    fireEvent.click(approve);
    await waitFor(() => expect(onApproved).toHaveBeenCalledWith("approved"));
    expect(
      (screen.getByLabelText("Manager password") as HTMLInputElement).value,
    ).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();

    rerender(
      <ManagerApprovalDialog
        open
        orderId="o1"
        request={null}
        onClose={onClose}
        onApproved={onApproved}
      />,
    );
    fireEvent.change(screen.getByLabelText("Manager password"), {
      target: { value: "secret" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Approve and continue" }),
    );
    expect(mocks.requestManagerApproval).toHaveBeenCalledTimes(1);

    rerender(
      <ManagerApprovalDialog
        open
        orderId="o1"
        request={request}
        onClose={onClose}
        onApproved={onApproved}
      />,
    );
    mocks.requestManagerApproval.mockRejectedValueOnce(new Error("Denied"));
    fireEvent.change(screen.getByLabelText("Manager email"), {
      target: { value: "manager@example.com" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Approve and continue" }),
    );
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith({
        title: "Denied",
        tone: "danger",
      }),
    );
  });
});
