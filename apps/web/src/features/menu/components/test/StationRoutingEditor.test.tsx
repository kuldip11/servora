import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  assignItem: vi.fn(async () => ({})),
  removeItem: vi.fn(async () => ({})),
  invalidate: vi.fn(async () => ({})),
  error: vi.fn(),
  mutateRoute: vi.fn(),
}));
vi.mock("@pos/ui", () => ({
  Button: ({ children, loading: _loading, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  Card: ({ children, ...props }: any) => (
    <section {...props}>{children}</section>
  ),
  IconButton: ({ icon: Icon, ...props }: any) => (
    <button {...props}>
      <Icon />
    </button>
  ),
  Input: ({ label, error, ...props }: any) => (
    <label>
      {label}
      <input aria-label={label} {...props} />
      {error ? <span>{error}</span> : null}
    </label>
  ),
  Modal: ({ open, title, children }: any) =>
    open ? (
      <div role="dialog">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
  Select: ({ label, options = [], ...props }: any) => (
    <label>
      {label}
      <select aria-label={label} {...props}>
        {options.map((o: any) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  ),
}));
vi.mock("@tanstack/react-query", () => ({
  useMutation: (config: any) => ({
    isPending: false,
    mutate: (arg: any) =>
      Promise.resolve(config.mutationFn(arg))
        .then((value) => config.onSuccess?.(value, arg))
        .catch(config.onError),
  }),
}));
vi.mock("@/shared/lib/query-client", () => ({
  queryClient: { invalidateQueries: h.invalidate },
}));
vi.mock("@/shared/lib/notify", () => ({ notifyError: h.error }));
vi.mock("@/features/menu/hooks/useMenus", () => ({
  useMenus: () => ({
    data: [
      { id: "default", name: "Default", isDefault: true },
      { id: "m2", name: "Dinner", isDefault: false },
    ],
  }),
}));
vi.mock("@/features/menu/services/menus.service", () => ({
  menusService: { assignItem: h.assignItem, removeItem: h.removeItem },
}));
vi.mock("@/features/menu/hooks/useKitchenStations", () => ({
  useKitchenStations: () => ({ data: [{ id: "s1", name: "Grill" }] }),
  useItemStationRoutes: () => ({
    data: [{ stationId: "s1", modifierOptionId: null }],
  }),
  useSetItemStationRoute: () => ({ mutate: h.mutateRoute }),
}));

import { StationRoutingEditor } from "../forms/StationRoutingEditor";

describe("StationRoutingEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("updates base and modifier-option station routes", () => {
    render(
      <StationRoutingEditor
        itemId="i1"
        groups={[
          {
            id: "g1",
            name: "Milk",
            options: [{ id: "o1", name: "Oat" }],
          } as any,
        ]}
      />,
    );
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects.at(-2)!, { target: { value: "" } });
    fireEvent.change(selects.at(-1)!, { target: { value: "s1" } });
    expect(h.mutateRoute).toHaveBeenCalledWith({ stationId: null });
    expect(h.mutateRoute).toHaveBeenCalledWith({
      stationId: "s1",
      modifierOptionId: "o1",
    });
  });
});
