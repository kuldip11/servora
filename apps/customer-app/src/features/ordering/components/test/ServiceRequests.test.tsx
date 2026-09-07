import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ServiceRequests } from "../ServiceRequests";
describe("ServiceRequests", () => {
  it("owns service request actions, filtering, busy state and status messaging", () => {
    const onRequest = vi.fn();
    const { rerender } = render(
      <ServiceRequests
        mode="DINE_IN"
        onRequest={onRequest}
        busy={false}
        message={null}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Call waiter/i }));
    fireEvent.click(screen.getByRole("button", { name: /Request bill/i }));
    expect(onRequest).toHaveBeenNthCalledWith(1, "CALL_WAITER");
    expect(onRequest).toHaveBeenNthCalledWith(2, "BILL");
    rerender(
      <ServiceRequests
        mode="TAKEAWAY"
        onRequest={onRequest}
        busy
        message="Sent"
      />,
    );
    expect(screen.queryByRole("button", { name: /Request bill/i })).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("Sent");
    expect(
      (screen.getByRole("button", { name: /Water/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
