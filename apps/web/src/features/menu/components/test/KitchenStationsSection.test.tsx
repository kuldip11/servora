import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  stations: [] as any[],
  loading: false,
  createStation: vi.fn(),
  delStation: vi.fn(),
}));
vi.mock("@/features/menu/hooks/useKitchenStations", () => ({
  useKitchenStations: () => ({ data: h.stations, isLoading: h.loading }),
  useCreateKitchenStation: () => ({
    isPending: false,
    mutate: h.createStation,
  }),
  useDeleteKitchenStation: () => ({ mutate: h.delStation }),
}));
vi.mock("@/config/app-urls", () => ({
  appUrls: { kitchen: "https://kds.test" },
}));
vi.mock("@pos/ui", () => ({
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

import { KitchenStationsSection } from "../KitchenStationsSection";

describe("KitchenStationsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.stations = [];
    h.loading = false;
  });

  it("renders loading/empty states and supports create, links and delete", () => {
    h.loading = true;
    const { rerender } = render(<KitchenStationsSection />);
    expect(screen.getByText(/Loading stations/)).toBeTruthy();
    h.loading = false;
    rerender(<KitchenStationsSection />);
    expect(screen.getByText(/No stations configured/)).toBeTruthy();

    h.createStation.mockImplementation((_value: any, options: any) =>
      options?.onSuccess?.(),
    );
    fireEvent.change(screen.getByLabelText("New station"), {
      target: { value: " Grill " },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: /Create/ }).closest("form")!,
    );
    expect(h.createStation).toHaveBeenCalledWith(
      { name: "Grill" },
      expect.anything(),
    );

    h.stations = [
      { id: "s1", name: "Grill", printerIdentifier: null },
      { id: "s2", name: "Bar", printerIdentifier: "P2" },
    ];
    rerender(<KitchenStationsSection />);
    expect(screen.getByText("No printer assigned")).toBeTruthy();
    expect(screen.getByText("P2")).toBeTruthy();
    expect(
      screen
        .getAllByRole("link", { name: /Open KDS/ })[0]
        ?.getAttribute("href"),
    ).toBe("https://kds.test?stationId=s1");
    fireEvent.click(screen.getByLabelText("Delete Grill"));
    expect(h.delStation).toHaveBeenCalledWith("s1");
  });
});
