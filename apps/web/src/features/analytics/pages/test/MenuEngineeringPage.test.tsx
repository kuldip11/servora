import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { chooseSelectOption } from "@/test/select";

const h = vi.hoisted(() => ({
  useMenuEngineering: vi.fn(),
  state: { current: {} as any },
}));
vi.mock("@/features/analytics/hooks/useMenuEngineering", () => ({
  useMenuEngineering: (days: number) => {
    h.useMenuEngineering(days);
    return h.state.current;
  },
}));
vi.mock("@/shared/lib/api-client", () => ({
  extractApiError: (error: unknown) =>
    error instanceof Error ? error.message : "boom",
}));
vi.mock("@pos/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@pos/ui")>()),
  Badge: ({ children }: any) => <span>{children}</span>,
  Button: ({ children, loading: _l, ...p }: any) => (
    <button {...p}>{children}</button>
  ),
  Card: ({ children }: any) => <section>{children}</section>,
  Page: ({ children }: any) => <main>{children}</main>,
  PageHeader: ({ title, description, actions }: any) => (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
      {actions}
    </header>
  ),
  Spinner: () => <span>spinner</span>,
}));

import { MenuEngineeringPage } from "../MenuEngineeringPage";
const rows = [
  {
    menuItemId: "1",
    menuItemName: "Zulu",
    variantName: null,
    margin: 20,
    marginPercent: 10,
    salesVolume: 5,
    quadrant: "STAR",
    recommendation: "Keep",
  },
  {
    menuItemId: "2",
    menuItemName: "Alpha",
    variantName: "Large",
    margin: null,
    marginPercent: null,
    salesVolume: 10,
    quadrant: "DOG",
    recommendation: "Drop",
  },
];

describe("MenuEngineeringPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.state.current = {
      data: rows,
      isLoading: false,
      isFetching: false,
      error: null,
    };
  });

  it("uses the applied analysis window and preserves client-side filters", () => {
    render(<MenuEngineeringPage />);
    expect(h.useMenuEngineering).toHaveBeenCalledWith(90);
    chooseSelectOption("Analysis window", "30 days");
    expect(h.useMenuEngineering).toHaveBeenLastCalledWith(90);
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(h.useMenuEngineering).toHaveBeenLastCalledWith(30);
    chooseSelectOption("Quadrant", "Stars");
    expect(screen.getByText("Zulu")).toBeTruthy();
    expect(screen.queryByText(/Alpha/)).toBeNull();
  });

  it("covers empty and error states", () => {
    h.state.current = {
      data: [],
      isLoading: false,
      isFetching: false,
      error: null,
    };
    const view = render(<MenuEngineeringPage />);
    expect(screen.getByText(/No menu items match/)).toBeTruthy();
    view.unmount();
    h.state.current = {
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: new Error("boom"),
    };
    render(<MenuEngineeringPage />);
    expect(screen.getByText("Menu engineering unavailable")).toBeTruthy();
    expect(screen.getByText("boom")).toBeTruthy();
  });
});
