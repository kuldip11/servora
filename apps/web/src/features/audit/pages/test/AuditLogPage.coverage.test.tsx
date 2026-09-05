import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  infiniteQuery: vi.fn(),
  auditList: vi.fn(),
  menuHistory: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useInfiniteQuery: mocks.infiniteQuery,
}));
vi.mock("@/features/audit/services/audit.service", () => ({
  auditService: { list: mocks.auditList, menuHistory: mocks.menuHistory },
}));
vi.mock("lucide-react", () => ({ ShieldCheck: () => <span>shield</span> }));
vi.mock("@pos/ui", () => ({
  Badge: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  Button: ({ children, onClick, loading }: any) => (
    <button data-loading={String(Boolean(loading))} onClick={onClick}>{children}</button>
  ),
  Card: ({ children }: React.PropsWithChildren) => <section>{children}</section>,
  Page: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
  PageHeader: ({ title, description }: any) => <header><h1>{title}</h1><p>{description}</p></header>,
}));

import { AuditLogPage } from "../AuditLogPage";

const auditEvent = {
  id: "a1",
  action: "ORDER_STATUS_UPDATED",
  createdAt: "2026-09-05T00:00:00Z",
  userName: null,
  userId: null,
  entity: "ORDER",
  entityId: "1234567890",
  metadata: JSON.stringify({ branchId: "b1", status: "READY", count: 2 }),
};
const menuEvent = {
  id: "m1",
  changeType: "PUBLISHED",
  changedAt: "2026-09-05T01:00:00Z",
  entityType: "MENU_ITEM",
  entityId: "abcdefghij",
  diff: { name: ["Old", "New"] },
};

const result = (overrides: Record<string, unknown> = {}) => ({
  data: { pages: [[]] }, isLoading: false, isError: false,
  hasNextPage: false, fetchNextPage: vi.fn(), isFetchingNextPage: false,
  ...overrides,
});

describe("AuditLogPage coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.infiniteQuery
      .mockReturnValueOnce(result())
      .mockReturnValueOnce(result({ isLoading: false }));
  });

  it("renders loading, error and empty states", () => {
    mocks.infiniteQuery.mockReset();
    mocks.infiniteQuery
      .mockReturnValueOnce(result({ isLoading: true }))
      .mockReturnValueOnce(result({ isLoading: true }));
    const { unmount } = render(<AuditLogPage />);
    expect(screen.getByText("Loading menu history…")).toBeTruthy();
    unmount();

    mocks.infiniteQuery.mockReset();
    mocks.infiniteQuery
      .mockReturnValueOnce(result({ isError: true }))
      .mockReturnValueOnce(result());
    render(<AuditLogPage />);
    expect(screen.getByText("Unable to load the audit log.")).toBeTruthy();
    expect(screen.getByText("No matching menu changes yet.")).toBeTruthy();
  });

  it("renders activity/menu history and exercises pagination and filters", () => {
    const fetchAudit = vi.fn();
    const fetchMenu = vi.fn();
    mocks.infiniteQuery.mockReset();
    mocks.infiniteQuery
      .mockReturnValueOnce(result({ data: { pages: [[auditEvent, { ...auditEvent, id: "a2", userId: "u1", userName: "Ada", entityId: null, metadata: "not-json" }]] }, hasNextPage: true, fetchNextPage: fetchAudit, isFetchingNextPage: true }))
      .mockReturnValueOnce(result({ data: { pages: [[menuEvent]] }, hasNextPage: true, fetchNextPage: fetchMenu, isFetchingNextPage: true }))
      .mockReturnValue(result());

    render(<AuditLogPage />);
    expect(screen.getAllByText("Order Status Updated")).toHaveLength(2);
    expect(screen.getByText("System")).toBeTruthy();
    expect(screen.getByText("Ada")).toBeTruthy();
    expect(screen.getByText(/status: READY/)).toBeTruthy();
    expect(screen.getByText(/not-json/)).toBeTruthy();
    expect(screen.getAllByText("Published").length).toBeGreaterThan(0);
    expect(screen.getByText("Menu Item")).toBeTruthy();

    fireEvent.click(screen.getByText("Load older activity"));
    fireEvent.click(screen.getByText("Load older menu changes"));
    expect(fetchAudit).toHaveBeenCalled();
    expect(fetchMenu).toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Entity type"), { target: { value: "MENU" } });
    fireEvent.change(screen.getByLabelText("Change type"), { target: { value: "UPDATED" } });
    expect(screen.getByLabelText("Entity type")).toHaveProperty("value", "MENU");
    expect(screen.getByLabelText("Change type")).toHaveProperty("value", "UPDATED");
  });
});
