import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  useOrders: vi.fn(),
  useCustomerRequests: vi.fn(),
  useResolveCustomerRequest: vi.fn(),
}));

vi.mock("../../../orders/hooks/useOrders", () => ({
  useOrders: mocks.useOrders,
}));
vi.mock("@/features/home/hooks/useCustomerRequests", () => ({
  useCustomerRequests: mocks.useCustomerRequests,
  useResolveCustomerRequest: mocks.useResolveCustomerRequest,
}));
vi.mock("@pos/api-client", () => ({
  extractApiError: (_error: unknown, fallback?: string) => fallback ?? "error",
}));
vi.mock("@pos/ui", () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  QueryErrorState: ({ title }: any) => <div>{title}</div>,
  StaleDataBanner: ({ message }: any) => <div>{message}</div>,
}));

import { HomePage } from "@/features/home/pages/HomePage";

const query = (overrides: Record<string, unknown> = {}) => ({
  data: [],
  isError: false,
  error: null,
  isFetching: false,
  refetch: vi.fn(),
  ...overrides,
});

beforeEach(() => {
  mocks.useOrders.mockReturnValue(query());
  mocks.useCustomerRequests.mockReturnValue(query());
  mocks.useResolveCustomerRequest.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    variables: undefined,
  });
});

describe("HomePage", () => {
  it("renders the healthy empty state only after dependencies load successfully", () => {
    const html = renderToStaticMarkup(
      <HomePage
        onNewOrder={vi.fn()}
        onViewOrders={vi.fn()}
        onSelectOrder={vi.fn()}
      />,
    );
    expect(html).toContain("Good evening");
    expect(html).toContain("All caught up");
  });

  it("does not render All caught up when an attention dependency fails", () => {
    mocks.useOrders.mockReturnValue(
      query({ data: undefined, isError: true, error: new Error("offline") }),
    );
    const html = renderToStaticMarkup(
      <HomePage
        onNewOrder={vi.fn()}
        onViewOrders={vi.fn()}
        onSelectOrder={vi.fn()}
      />,
    );
    expect(html).toContain("Unable to load attention items");
    expect(html).not.toContain("All caught up");
  });
});
