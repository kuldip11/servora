import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: { current: {} as any } }));

vi.mock("@/features/operations/hooks/useOperationsSnapshot", () => ({
  useOperationsSnapshot: () => mocks.query.current,
}));
vi.mock("@/shared/lib/api-client", () => ({
  extractApiError: (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback,
}));
vi.mock("@pos/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@pos/ui")>()),
  Badge: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  Card: ({ children }: React.PropsWithChildren) => (
    <section>{children}</section>
  ),
  Page: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
  PageHeader: ({ title, description }: any) => (
    <header>
      <h1>{title}</h1>
      <span>{description}</span>
    </header>
  ),
  QueryErrorState: ({ title, description, onRetry }: any) => (
    <div role="alert">
      <span>{title}</span>
      <span>{description}</span>
      <button onClick={onRetry}>retry</button>
    </div>
  ),
  Spinner: () => <span>loading</span>,
  StaleDataBanner: ({ message }: any) => <div role="status">{message}</div>,
}));

import { BranchHealthPage } from "../BranchHealthPage";

const data = {
  branches: [
    {
      id: "b1",
      name: "Central",
      code: "CTR",
      timezone: "Asia/Kolkata",
      isActive: true,
      kdsEnabled: true,
      waiterAppEnabled: true,
      dineInEnabled: true,
      takeawayEnabled: true,
      deliveryEnabled: false,
      onlineEnabled: true,
    },
  ],
  availability: [],
};

describe("BranchHealthPage error states", () => {
  beforeEach(() => {
    mocks.query.current = {
      data,
      isLoading: false,
      isError: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    };
  });

  it("shows a blocking error when no branch-health data could be loaded", () => {
    mocks.query.current = {
      data: undefined,
      isLoading: false,
      isError: true,
      isFetching: false,
      error: new Error("branch health unavailable"),
      refetch: vi.fn(),
    };
    render(<BranchHealthPage />);
    expect(screen.getByText("Unable to load branch health")).toBeTruthy();
    expect(screen.getByText("branch health unavailable")).toBeTruthy();
    expect(screen.queryByText("Central")).toBeNull();
  });

  it("keeps cached branch health visible and marks it stale after refresh failure", () => {
    mocks.query.current = {
      data,
      isLoading: false,
      isError: true,
      isFetching: false,
      error: new Error("refresh failed"),
      refetch: vi.fn(),
    };
    render(<BranchHealthPage />);
    expect(screen.getByText(/Branch health refresh failed/)).toBeTruthy();
    expect(screen.getByText("Central")).toBeTruthy();
  });
});
