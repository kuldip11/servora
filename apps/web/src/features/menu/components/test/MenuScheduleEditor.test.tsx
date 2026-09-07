import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  schedules: [
    { id: "s1", scheduleType: "DAILY", startTime: "07:00", endTime: "11:00" },
  ] as any[],
  add: vi.fn(),
  remove: vi.fn(),
  invalidate: vi.fn(),
  mutationIndex: 0,
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: mocks.schedules }),
  useMutation: () => {
    const idx = mocks.mutationIndex++;
    return idx % 2 === 0
      ? { mutate: mocks.add, isPending: false }
      : { mutate: mocks.remove, isPending: false };
  },
}));
vi.mock("@pos/api-client", () => ({
  createMenuApi: () => ({
    listMenuSchedules: vi.fn(),
    createMenuSchedule: vi.fn(),
    removeMenuSchedule: vi.fn(),
  }),
}));
vi.mock("@/shared/lib/api-client", () => ({ apiClient: {} }));
vi.mock("@/shared/lib/query-client", () => ({
  queryClient: { invalidateQueries: mocks.invalidate },
}));
vi.mock("@pos/ui", () => ({
  Button: ({ children, loading: _l, ...p }: any) => (
    <button {...p}>{children}</button>
  ),
  Input: ({ label, value, onChange }: any) => (
    <label>
      {label}
      <input aria-label={label} value={value} onChange={onChange} />
    </label>
  ),
}));
import { MenuScheduleEditor } from "../MenuScheduleEditor";
describe("MenuScheduleEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mutationIndex = 0;
    mocks.schedules = [
      { id: "s1", scheduleType: "DAILY", startTime: "07:00", endTime: "11:00" },
    ];
  });
  it("owns schedule removal and daily/weekly/date/holiday draft transitions", () => {
    render(<MenuScheduleEditor menuId="m1" />);
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(mocks.remove).toHaveBeenCalledWith("s1");
    fireEvent.change(screen.getByLabelText("Menu start time"), {
      target: { value: "08:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add window" }));
    expect(mocks.add).toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Menu schedule type"), {
      target: { value: "WEEKLY" },
    });
    fireEvent.change(screen.getByLabelText("Day of week"), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add window" }));
    fireEvent.change(screen.getByLabelText("Menu schedule type"), {
      target: { value: "SPECIFIC_DATE" },
    });
    fireEvent.change(screen.getByLabelText("Menu start date"), {
      target: { value: "2026-09-10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add window" }));
    fireEvent.change(screen.getByLabelText("Menu schedule type"), {
      target: { value: "HOLIDAY" },
    });
    fireEvent.change(screen.getByLabelText("Holiday name"), {
      target: { value: "Diwali" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add window" }));
    expect(mocks.add).toHaveBeenCalledTimes(4);
  });
});
