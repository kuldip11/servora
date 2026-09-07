import { useReducer } from "react";
import { Button, Input } from "@pos/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createMenuApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";
import { queryClient } from "@/shared/lib/query-client";

const menuApi = createMenuApi(apiClient);

interface MenuScheduleRow {
  id: string;
  scheduleType: "DAILY" | "WEEKLY" | "SPECIFIC_DATE" | "HOLIDAY";
  startTime?: string | null;
  endTime?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  holidayName?: string | null;
}

interface ScheduleDraft {
  scheduleType: string;
  startTime: string;
  endTime: string;
  dayOfWeek: number;
  startDate: string;
  endDate: string;
  holidayName: string;
}

type ScheduleDraftAction = {
  type: "field";
  field: keyof ScheduleDraft;
  value: string | number;
};

const initialDraft: ScheduleDraft = {
  scheduleType: "DAILY",
  startTime: "07:00",
  endTime: "11:00",
  dayOfWeek: 1,
  startDate: "",
  endDate: "",
  holidayName: "",
};

const reducer = (
  state: ScheduleDraft,
  action: ScheduleDraftAction,
): ScheduleDraft => {
  if (action.type !== "field") return state;
  return { ...state, [action.field]: action.value } as ScheduleDraft;
};

export const MenuScheduleEditor = ({ menuId }: { menuId: string }) => {
  const [draft, dispatch] = useReducer(reducer, initialDraft);
  const key = ["menus", menuId, "schedules"];
  const { data: schedules = [] } = useQuery<MenuScheduleRow[]>({
    queryKey: key,
    queryFn: () => menuApi.listMenuSchedules<MenuScheduleRow>(menuId),
  });
  const add = useMutation({
    mutationFn: () =>
      menuApi.createMenuSchedule<MenuScheduleRow>(menuId, {
        scheduleType: draft.scheduleType,
        ...(draft.scheduleType === "DAILY" || draft.scheduleType === "WEEKLY"
          ? { startTime: draft.startTime, endTime: draft.endTime }
          : {}),
        ...(draft.scheduleType === "WEEKLY"
          ? { dayOfWeek: draft.dayOfWeek }
          : {}),
        ...(draft.scheduleType === "SPECIFIC_DATE"
          ? {
              startDate: draft.startDate,
              endDate: draft.endDate || draft.startDate,
            }
          : {}),
        ...(draft.scheduleType === "HOLIDAY"
          ? { holidayName: draft.holidayName }
          : {}),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => menuApi.removeMenuSchedule(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const setField = <K extends keyof ScheduleDraft>(
    field: K,
    value: ScheduleDraft[K],
  ) => dispatch({ type: "field", field, value });

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-text-primary">
        Menu windows
      </legend>
      {schedules.map((schedule) => (
        <div
          key={schedule.id}
          className="flex items-center justify-between rounded bg-surface-secondary px-3 py-2 text-sm"
        >
          <span>
            {schedule.scheduleType}:{" "}
            {schedule.holidayName ??
              schedule.startDate ??
              `${schedule.startTime?.slice(0, 5)}–${schedule.endTime?.slice(0, 5)}`}
          </span>
          <button
            type="button"
            className="text-danger"
            onClick={() => remove.mutate(schedule.id)}
          >
            Remove
          </button>
        </div>
      ))}
      <div className="space-y-2 rounded border border-border p-2">
        <select
          aria-label="Menu schedule type"
          value={draft.scheduleType}
          onChange={(event) => setField("scheduleType", event.target.value)}
          className="w-full rounded border border-border px-2 py-1"
        >
          <option value="DAILY">Every day</option>
          <option value="WEEKLY">Weekly</option>
          <option value="SPECIFIC_DATE">Date range</option>
          <option value="HOLIDAY">Holiday</option>
        </select>
        {(draft.scheduleType === "DAILY" ||
          draft.scheduleType === "WEEKLY") && (
          <div className="flex items-center gap-2">
            {draft.scheduleType === "WEEKLY" && (
              <select
                aria-label="Day of week"
                value={draft.dayOfWeek}
                onChange={(event) =>
                  setField("dayOfWeek", Number(event.target.value))
                }
                className="rounded border border-border px-2 py-1"
              >
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day, index) => (
                    <option key={day} value={index}>
                      {day}
                    </option>
                  ),
                )}
              </select>
            )}
            <input
              aria-label="Menu start time"
              type="time"
              value={draft.startTime}
              onChange={(event) => setField("startTime", event.target.value)}
              className="rounded border border-border px-2 py-1"
            />
            <span>to</span>
            <input
              aria-label="Menu end time"
              type="time"
              value={draft.endTime}
              onChange={(event) => setField("endTime", event.target.value)}
              className="rounded border border-border px-2 py-1"
            />
          </div>
        )}
        {draft.scheduleType === "SPECIFIC_DATE" && (
          <div className="flex items-center gap-2">
            <input
              aria-label="Menu start date"
              type="date"
              value={draft.startDate}
              onChange={(event) => setField("startDate", event.target.value)}
              className="rounded border border-border px-2 py-1"
            />
            <span>to</span>
            <input
              aria-label="Menu end date"
              type="date"
              value={draft.endDate}
              onChange={(event) => setField("endDate", event.target.value)}
              className="rounded border border-border px-2 py-1"
            />
          </div>
        )}
        {draft.scheduleType === "HOLIDAY" && (
          <Input
            label="Holiday name"
            value={draft.holidayName}
            onChange={(event) => setField("holidayName", event.target.value)}
          />
        )}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          loading={add.isPending}
          onClick={() => add.mutate()}
        >
          Add window
        </Button>
      </div>
      <p className="text-xs text-text-secondary">
        With no windows, this menu is active all day.
      </p>
    </fieldset>
  );
};
