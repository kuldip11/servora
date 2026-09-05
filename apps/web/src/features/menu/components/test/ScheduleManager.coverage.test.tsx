import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  schedules: [] as any[],
  loading: false,
  create: vi.fn(),
  remove: vi.fn(),
  pending: false,
}));
vi.mock("@/features/menu/hooks/useMenuItemSchedules", () => ({ useMenuItemSchedules: () => ({ data: h.schedules, isLoading: h.loading }) }));
vi.mock("@/features/menu/hooks/useAddSchedule", () => ({ useAddSchedule: () => ({ mutate: h.create, isPending: h.pending }) }));
vi.mock("@/features/menu/hooks/useDeleteSchedule", () => ({ useDeleteSchedule: () => ({ mutate: h.remove }) }));

import { ScheduleManager } from "../ScheduleManager";

describe("ScheduleManager coverage", () => {
  beforeEach(() => { vi.clearAllMocks(); h.schedules = []; h.loading = false; h.pending = false; });

  it("covers loading and empty states", () => {
    h.loading = true;
    const { rerender } = render(<ScheduleManager itemId="i1" />);
    expect(screen.getByText("Loading…")).toBeTruthy();
    h.loading = false;
    rerender(<ScheduleManager itemId="i1" />);
    expect(screen.getByText(/No schedules yet/)).toBeTruthy();
  });

  it("covers all schedule descriptions and deletion", () => {
    h.schedules = [
      { id: "d", scheduleType: "DAILY", startTime: "07:00:00", endTime: "11:00:00", statusDuringPeriod: "ACTIVE" },
      { id: "w", scheduleType: "WEEKLY", dayOfWeek: 2, startTime: "08:00:00", endTime: "09:00:00", statusDuringPeriod: "OUT_OF_STOCK" },
      { id: "r", scheduleType: "SPECIFIC_DATE", startDate: "2026-09-01", endDate: "2026-09-02", statusDuringPeriod: "ACTIVE" },
      { id: "r2", scheduleType: "SPECIFIC_DATE", startDate: "2026-09-03", endDate: "2026-09-03", statusDuringPeriod: "ACTIVE" },
      { id: "h", scheduleType: "HOLIDAY", holidayName: "Diwali", statusDuringPeriod: "ACTIVE" },
      { id: "x", scheduleType: "UNKNOWN", statusDuringPeriod: "ACTIVE" },
    ];
    render(<ScheduleManager itemId="i1" />);
    expect(screen.getByText(/Every day, 07:00–11:00/)).toBeTruthy();
    expect(screen.getByText(/2026-09-01 – 2026-09-02/)).toBeTruthy();
    expect(screen.getByText("2026-09-03")).toBeTruthy();
    expect(screen.getByText("Holiday: Diwali")).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/Remove schedule: Every day/));
    expect(h.remove).toHaveBeenCalledWith("d");
  });

  it("covers daily, weekly, date and holiday draft editing and creation", () => {
    h.create.mockImplementation((_payload, options) => options?.onSuccess?.());
    render(<ScheduleManager itemId="i1" />);
    fireEvent.click(screen.getByRole("button", { name: /Add schedule/ }));
    fireEvent.change(screen.getByLabelText("Start time"), { target: { value: "06:00" } });
    fireEvent.change(screen.getByLabelText("End time"), { target: { value: "10:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Add schedule" }));
    expect(h.create).toHaveBeenCalledWith(expect.objectContaining({ scheduleType: "DAILY", startTime: "06:00", endTime: "10:00" }), expect.any(Object));

    fireEvent.click(screen.getByRole("button", { name: /Add schedule/ }));
    const typeSelect = screen.getAllByRole("combobox")[0]!;
    fireEvent.change(typeSelect, { target: { value: "WEEKLY" } });
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[1]!, { target: { value: "5" } });
    fireEvent.change(selects.at(-1)!, { target: { value: "OUT_OF_STOCK" } });
    fireEvent.click(screen.getByRole("button", { name: "Add schedule" }));
    expect(h.create).toHaveBeenLastCalledWith(expect.objectContaining({ scheduleType: "WEEKLY", dayOfWeek: 5, statusDuringPeriod: "OUT_OF_STOCK" }), expect.any(Object));

    fireEvent.click(screen.getByRole("button", { name: /Add schedule/ }));
    fireEvent.change(screen.getAllByRole("combobox")[0]!, { target: { value: "SPECIFIC_DATE" } });
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-10-01" } });
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-10-03" } });
    fireEvent.click(screen.getByRole("button", { name: "Add schedule" }));
    expect(h.create).toHaveBeenLastCalledWith(expect.objectContaining({ scheduleType: "SPECIFIC_DATE", startDate: "2026-10-01", endDate: "2026-10-03" }), expect.any(Object));

    fireEvent.click(screen.getByRole("button", { name: /Add schedule/ }));
    fireEvent.change(screen.getAllByRole("combobox")[0]!, { target: { value: "HOLIDAY" } });
    expect((screen.getByRole("button", { name: "Add schedule" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Holiday name"), { target: { value: "Diwali" } });
    fireEvent.click(screen.getByRole("button", { name: "Add schedule" }));
    expect(h.create).toHaveBeenLastCalledWith(expect.objectContaining({ scheduleType: "HOLIDAY", holidayName: "Diwali" }), expect.any(Object));
  });

  it("covers cancel and pending labels", () => {
    render(<ScheduleManager itemId="i1" />);
    fireEvent.click(screen.getByRole("button", { name: /Add schedule/ }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: /Add schedule/ })).toBeTruthy();
    h.pending = true;
    fireEvent.click(screen.getByRole("button", { name: /Add schedule/ }));
    expect((screen.getByRole("button", { name: "Saving…" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
