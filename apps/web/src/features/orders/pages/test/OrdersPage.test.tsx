import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  has: vi.fn(() => true),
  useOrdersPage: vi.fn(),
  realtime: vi.fn(),
}));

vi.mock("@/shared/auth/permissions", () => ({
  usePermissions: () => ({ has: mocks.has }),
}));
vi.mock("@/features/orders/hooks/useOrders", () => ({
  useOrdersPage: mocks.useOrdersPage,
}));
vi.mock("@/features/orders/hooks/useOrdersRealtimeSync", () => ({
  useOrdersRealtimeSync: mocks.realtime,
}));
vi.mock("@/features/orders/components/CreateOrderModal", () => ({
  CreateOrderModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="create-modal"><button onClick={onClose}>close create</button></div>
  ),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <a {...props}>{children}</a>,
}));
vi.mock("@pos/ui", () => ({
  BUTTON_VARIANT_CLASSES: { secondary: "secondary" },
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button onClick={onClick} {...props}>{children}</button>,
  Badge: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  StatusBadge: ({ label }: { label: string }) => <span>{label}</span>,
  SearchInput: ({ value, onChange, onClear }: { value: string; onChange: React.ChangeEventHandler<HTMLInputElement>; onClear: () => void }) => <div><input aria-label="search" value={value} onChange={onChange}/><button onClick={onClear}>clear search</button></div>,
  SelectMenu: ({ "aria-label": label, value, onChange }: { "aria-label": string; value: string; onChange: (value: string | null) => void }) => <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value || null)}><option value="">all</option><option value="OPEN">OPEN</option><option value="DINE_IN">DINE_IN</option></select>,
  Table: ({ columns, data, onSortChange, emptyAction }: any) => <div data-testid="table"><button onClick={() => onSortChange?.({ columnId: "time", direction: "asc" })}>sort time</button><button onClick={() => onSortChange?.({ columnId: "total", direction: "desc" })}>sort total</button><button onClick={() => onSortChange?.({ columnId: "other", direction: "asc" })}>sort other</button>{data.length ? data.map((row: any) => <div key={row.id}>{columns.map((column: any) => <div key={column.id}>{column.cell?.(row)}</div>)}</div>) : emptyAction}</div>,
  FilterBar: ({ children, onClearAll }: React.PropsWithChildren<{ onClearAll?: () => void }>) => <div>{children}{onClearAll && <button onClick={onClearAll}>clear all</button>}</div>,
  Toolbar: ({ title, subtitle, actions }: { title: string; subtitle: string; actions: React.ReactNode }) => <div><h1>{title}</h1><span>{subtitle}</span>{actions}</div>,
  Page: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
  Card: ({ children }: React.PropsWithChildren) => <section>{children}</section>,
  Pagination: ({ onPageChange, onPageSizeChange }: { onPageChange: (p: number) => void; onPageSizeChange: (n: number) => void }) => <div><button onClick={() => onPageChange(2)}>page 2</button><button onClick={() => onPageSizeChange(50)}>size 50</button></div>,
}));

import { OrdersPage } from "../OrdersPage";

const order = (overrides: Record<string, unknown> = {}) => ({
  id: "order-12345678",
  type: "DINE_IN",
  status: "OPEN",
  createdAt: "2026-09-04T12:00:00.000Z",
  totalAmount: "123.45",
  items: [{ id: "i1" }],
  table: { name: "7" },
  kitchenTickets: [{ id: "k1", status: "READY" }],
  ...overrides,
});

describe("OrdersPage coverage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.has.mockReturnValue(true);
    mocks.useOrdersPage.mockReturnValue({
      data: { items: [order(), order({ id: "served-12345678", table: null, status: "UNKNOWN", kitchenTickets: [{ id: "k2", status: "SERVED" }] }), order({ id: "multi-12345678", kitchenTickets: [{ id: "1", status: "FIRED" }, { id: "2", status: "FIRED" }] })], pagination: { total: 76 } },
      isLoading: false,
      isFetching: false,
    });
  });

  it("renders rows and drives filters, sorting, paging, and create modal", () => {
    render(<OrdersPage />);
    expect(screen.getByText("Orders")).toBeTruthy();
    expect(screen.getAllByText("Table 7").length).toBeGreaterThan(0);
    expect(screen.getByText("Ready")).toBeTruthy();
    expect(screen.getByText("All served")).toBeTruthy();
    expect(screen.getByText("2 tickets")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("search"), { target: { value: " abc " } });
    act(() => vi.advanceTimersByTime(300));
    expect(mocks.useOrdersPage).toHaveBeenLastCalledWith(expect.objectContaining({ search: "abc" }));
    fireEvent.change(screen.getByLabelText("Filter orders by status"), { target: { value: "OPEN" } });
    fireEvent.change(screen.getByLabelText("Filter orders by type"), { target: { value: "DINE_IN" } });
    fireEvent.click(screen.getByText("clear all"));
    fireEvent.click(screen.getByText("sort time"));
    expect(mocks.useOrdersPage).toHaveBeenLastCalledWith(expect.objectContaining({ sortBy: "createdAt", sortDirection: "asc" }));
    fireEvent.click(screen.getByText("sort total"));
    expect(mocks.useOrdersPage).toHaveBeenLastCalledWith(expect.objectContaining({ sortBy: "total", sortDirection: "desc" }));
    fireEvent.click(screen.getByText("sort other"));
    fireEvent.click(screen.getByText("page 2"));
    fireEvent.click(screen.getByText("size 50"));
    fireEvent.click(screen.getAllByText("New Order")[0]!);
    expect(screen.getByTestId("create-modal")).toBeTruthy();
    fireEvent.click(screen.getByText("close create"));
    expect(screen.queryByTestId("create-modal")).toBeNull();
  });

  it("renders empty state and hides create action without permission", () => {
    mocks.has.mockReturnValue(false);
    mocks.useOrdersPage.mockReturnValue({ data: undefined, isLoading: true, isFetching: true });
    render(<OrdersPage />);
    expect(screen.getByText("0 total orders")).toBeTruthy();
    expect(screen.getByText("New Order")).toBeTruthy();
    fireEvent.click(screen.getByText("clear search"));
  });
});
