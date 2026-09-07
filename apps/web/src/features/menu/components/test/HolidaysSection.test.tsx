import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  holidays: [] as any[],
  addHoliday: vi.fn(),
  delHoliday: vi.fn(),
}));
vi.mock("@/features/menu/hooks/useMenuHolidays", () => ({
  useMenuHolidays: () => ({ data: h.holidays }),
}));
vi.mock("@/features/menu/hooks/useAddHoliday", () => ({
  useAddHoliday: () => ({ isPending: false, mutate: h.addHoliday }),
}));
vi.mock("@/features/menu/hooks/useDeleteHoliday", () => ({
  useDeleteHoliday: () => ({ mutate: h.delHoliday }),
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

import { HolidaysSection } from "../HolidaysSection";

describe("HolidaysSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.holidays = [];
  });

  it("renders empty state and supports add, trim and delete", async () => {
    const { rerender } = render(<HolidaysSection />);
    expect(screen.getByText(/No holidays/)).toBeTruthy();
    h.addHoliday.mockImplementation((_value: any, options: any) =>
      options?.onSuccess?.(),
    );
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Diwali" },
    });
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2026-11-08" },
    });
    fireEvent.change(screen.getByLabelText("Region (optional)"), {
      target: { value: " India " },
    });
    fireEvent.submit(screen.getByRole("button").closest("form")!);
    await waitFor(() =>
      expect(h.addHoliday).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Diwali",
          holidayDate: "2026-11-08",
          region: "India",
        }),
        expect.anything(),
      ),
    );

    h.holidays = [
      { id: "h1", name: "Diwali", holidayDate: "2026-11-08", region: "IN" },
    ];
    rerender(<HolidaysSection />);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByLabelText("Remove holiday Diwali"));
    expect(h.delHoliday).toHaveBeenCalledWith("h1");
  });
});
