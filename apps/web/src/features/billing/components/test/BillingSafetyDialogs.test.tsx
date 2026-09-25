import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  orderBills: vi.fn(),
  printBills: vi.fn(),
  collectMutate: vi.fn(),
  collectPending: false,
  refetch: vi.fn(),
}));

vi.mock("@/features/billing/hooks/useOrderBills", () => ({
  useOrderBills: () => mocks.orderBills(),
}));
vi.mock("@/features/billing/utils/print-bills", () => ({
  printBills: mocks.printBills,
}));
vi.mock("@/features/billing/hooks/useCollectPayment", () => ({
  useCollectPayment: () => ({
    mutate: mocks.collectMutate,
    isPending: mocks.collectPending,
  }),
}));
vi.mock("@/shared/lib/api-client", () => ({
  apiClient: {},
  extractApiError: (_error: unknown, fallback?: string) => fallback ?? "error",
}));
vi.mock("@pos/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@pos/ui")>()),
  Modal: ({ children, title }: any) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
  QueryErrorState: ({ title, description, onRetry }: any) => (
    <div>
      <span>{title}</span>
      <span>{description}</span>
      <button onClick={onRetry}>Retry query</button>
    </div>
  ),
  Spinner: () => <span>spinner</span>,
  StatusBadge: ({ label }: any) => <span>{label}</span>,
  Button: ({ children, disabled, loading, onClick }: any) => (
    <button disabled={disabled || loading} onClick={onClick}>
      {children}
    </button>
  ),
  Select: ({ label, options, value, onChange }: any) => (
    <label>
      {label}
      <select aria-label={label} value={value} onChange={onChange}>
        {options.map((option: any) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  ),
  Input: ({ label, value, onChange, type = "text" }: any) => (
    <label>
      {label}
      <input aria-label={label} type={type} value={value} onChange={onChange} />
    </label>
  ),
}));

import { PaymentDialog } from "../PaymentDialog";
import { PrintBillsDialog } from "../PrintBillsDialog";

const order = {
  id: "12345678-1234-4234-8234-1234567890ab",
  type: "DINE_IN",
  subtotal: 100,
  taxAmount: 5,
  discountAmount: 0,
  serviceChargeAmount: 0,
  totalAmount: 105,
  createdAt: "2026-09-18T00:00:00.000Z",
  payments: [],
  items: [],
  table: { name: "4" },
} as any;

const queryState = (overrides: Record<string, unknown> = {}) => ({
  data: [],
  isLoading: false,
  isSuccess: true,
  isError: false,
  error: null,
  isFetching: false,
  refetch: mocks.refetch,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.orderBills.mockReturnValue(queryState());
});

describe("billing safety dialogs", () => {
  it("does not expose fallback printing while bills are still loading", () => {
    mocks.orderBills.mockReturnValue(
      queryState({ data: undefined, isLoading: true, isSuccess: false }),
    );
    render(<PrintBillsDialog order={order} onClose={vi.fn()} />);
    expect(screen.getByText("spinner")).toBeTruthy();
    expect(screen.queryByText("Whole order")).toBeNull();
    expect(screen.queryByText("Print selected")).toBeNull();
  });

  it("blocks fallback printing when bill retrieval fails and allows retry", () => {
    mocks.orderBills.mockReturnValue(
      queryState({
        data: undefined,
        isSuccess: false,
        isError: true,
        error: new Error("billing offline"),
      }),
    );
    render(<PrintBillsDialog order={order} onClose={vi.fn()} />);
    expect(screen.getByText("Unable to load bills")).toBeTruthy();
    expect(screen.queryByText("Whole order")).toBeNull();
    expect(screen.queryByText("Print selected")).toBeNull();
    fireEvent.click(screen.getByText("Retry query"));
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
  });

  it("uses the whole-order fallback only after a successful empty bill response", () => {
    render(<PrintBillsDialog order={order} onClose={vi.fn()} />);
    expect(screen.getByText("Whole order")).toBeTruthy();
    expect(screen.getByText("Print selected")).toBeTruthy();
  });

  it("blocks payment controls while billing state is loading", () => {
    mocks.orderBills.mockReturnValue(
      queryState({ data: undefined, isLoading: true, isSuccess: false }),
    );
    render(<PaymentDialog order={order} onClose={vi.fn()} />);
    expect(screen.getByText("spinner")).toBeTruthy();
    expect(screen.queryByText("Confirm Payment")).toBeNull();
  });

  it("blocks payment on bill-query failure and exposes retry", () => {
    mocks.orderBills.mockReturnValue(
      queryState({
        data: undefined,
        isSuccess: false,
        isError: true,
        error: new Error("billing offline"),
      }),
    );
    render(<PaymentDialog order={order} onClose={vi.fn()} />);
    expect(screen.getByText("Unable to load billing state")).toBeTruthy();
    expect(screen.queryByText("Confirm Payment")).toBeNull();
    fireEvent.click(screen.getByText("Retry query"));
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
    expect(mocks.collectMutate).not.toHaveBeenCalled();
  });

  it("enables the normal payment path only after bill state loads successfully", () => {
    render(<PaymentDialog order={order} onClose={vi.fn()} />);
    const confirm = screen.getByText("Confirm Payment") as HTMLButtonElement;
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
    expect(mocks.collectMutate).toHaveBeenCalledTimes(1);
  });
});
