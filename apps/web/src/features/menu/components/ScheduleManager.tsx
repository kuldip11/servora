import { useState } from "react";
import { Plus, X, Clock } from "lucide-react";
import { Select } from "@pos/ui";
import { MENU_ITEM_STATUS_OPTIONS } from "@/features/menu/constants";
import { useMenuItemSchedules } from "@/features/menu/hooks/useMenuItemSchedules";
import { useAddSchedule } from "@/features/menu/hooks/useAddSchedule";
import { useDeleteSchedule } from "@/features/menu/hooks/useDeleteSchedule";
import type {
  MenuItemSchedule,
  MenuItemScheduleType,
  MenuItemStatus,
} from "@pos/types";

import { WEEK_DAYS } from "@/features/menu/constants";

const SCHEDULE_TYPE_OPTIONS: { value: MenuItemScheduleType; label: string }[] =
  [
    { value: "DAILY", label: "Every day, time window" },
    { value: "WEEKLY", label: "One day a week" },
    { value: "SPECIFIC_DATE", label: "Specific date range" },
    { value: "HOLIDAY", label: "Holiday" },
  ];

interface Draft {
  scheduleType: MenuItemScheduleType;
  startTime: string;
  endTime: string;
  dayOfWeek: number;
  startDate: string;
  endDate: string;
  holidayName: string;
  statusDuringPeriod: MenuItemStatus;
}

const EMPTY_DRAFT: Draft = {
  scheduleType: "DAILY",
  startTime: "07:00",
  endTime: "11:00",
  dayOfWeek: 1,
  startDate: "",
  endDate: "",
  holidayName: "",
  statusDuringPeriod: "ACTIVE",
};

const describe = (s: MenuItemSchedule): string => {
  switch (s.scheduleType) {
    case "DAILY":
      return `Every day, ${s.startTime?.slice(0, 5)}–${s.endTime?.slice(0, 5)}`;
    case "WEEKLY":
      return `${WEEK_DAYS[s.dayOfWeek ?? 0]}, ${s.startTime?.slice(0, 5)}–${s.endTime?.slice(0, 5)}`;
    case "SPECIFIC_DATE":
      return s.endDate && s.endDate !== s.startDate
        ? `${s.startDate} – ${s.endDate}`
        : `${s.startDate}`;
    case "HOLIDAY":
      return `Holiday: ${s.holidayName}`;
    default:
      return "";
  }
};

export const ScheduleManager = ({ itemId }: { itemId: string }) => {
  const [draft, setDraft] = useState<Draft | null>(null);

  const { data: schedules, isLoading } = useMenuItemSchedules(itemId);
  const createMutation = useAddSchedule(itemId);
  const deleteMutation = useDeleteSchedule(itemId);

  const canSave =
    draft &&
    ((draft.scheduleType === "DAILY" && draft.startTime && draft.endTime) ||
      (draft.scheduleType === "WEEKLY" && draft.startTime && draft.endTime) ||
      (draft.scheduleType === "SPECIFIC_DATE" && draft.startDate) ||
      (draft.scheduleType === "HOLIDAY" && draft.holidayName.trim()));

  function handleCreate() {
    if (!draft) return;
    createMutation.mutate(
      {
        scheduleType: draft.scheduleType,
        statusDuringPeriod: draft.statusDuringPeriod,
        startTime: draft.startTime,
        endTime: draft.endTime,
        dayOfWeek: draft.dayOfWeek,
        startDate: draft.startDate,
        endDate: draft.endDate,
        holidayName: draft.holidayName,
      },
      { onSuccess: () => setDraft(null) },
    );
  }

  return (
    <div>
      <span className="text-sm font-medium text-text-primary mb-1.5 block">
        Availability windows{" "}
        <span className="font-normal text-text-disabled">
          (item only shows/hides for these — everything else uses its base
          status)
        </span>
      </span>

      {isLoading ? (
        <p className="text-xs text-text-disabled">Loading…</p>
      ) : !schedules?.length && !draft ? (
        <p className="text-xs text-text-disabled mb-2">
          No schedules yet — this item follows its base status all the time.
        </p>
      ) : (
        <div className="space-y-1.5 mb-2">
          {schedules?.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-2 px-3 py-1.5 bg-surface-secondary rounded-md text-xs"
            >
              <div className="flex items-center gap-2 text-text-secondary">
                <Clock className="w-3.5 h-3.5 text-text-disabled" />
                <span>{describe(s)}</span>
                <span className="text-text-disabled">→</span>
                <span className="font-medium">
                  {
                    MENU_ITEM_STATUS_OPTIONS.find(
                      (o) => o.value === s.statusDuringPeriod,
                    )?.label
                  }
                </span>
              </div>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(s.id)}
                aria-label={`Remove schedule: ${describe(s)}`}
                className="text-text-disabled hover:text-danger"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      {draft ? (
        <div className="border border-border rounded-md p-3 space-y-2">
          <Select
            aria-label="Schedule type"
            value={draft.scheduleType}
            onChange={(value) =>
              setDraft({
                ...draft,
                scheduleType: value as MenuItemScheduleType,
              })
            }
            options={SCHEDULE_TYPE_OPTIONS}
          />

          {(draft.scheduleType === "DAILY" ||
            draft.scheduleType === "WEEKLY") && (
            <div className="flex items-center gap-2">
              {draft.scheduleType === "WEEKLY" && (
                <Select
                  aria-label="Day of week"
                  value={String(draft.dayOfWeek)}
                  onChange={(value) =>
                    setDraft({
                      ...draft,
                      dayOfWeek: Number(value),
                    })
                  }
                  options={WEEK_DAYS.map((day, index) => ({
                    value: String(index),
                    label: day,
                  }))}
                  containerClassName="min-w-28"
                />
              )}
              <input
                type="time"
                value={draft.startTime}
                onChange={(e) =>
                  setDraft({ ...draft, startTime: e.target.value })
                }
                aria-label="Start time"
                className="px-2 py-1.5 text-sm border border-border rounded-md"
              />
              <span className="text-text-disabled text-xs">to</span>
              <input
                type="time"
                value={draft.endTime}
                onChange={(e) =>
                  setDraft({ ...draft, endTime: e.target.value })
                }
                aria-label="End time"
                className="px-2 py-1.5 text-sm border border-border rounded-md"
              />
            </div>
          )}

          {draft.scheduleType === "SPECIFIC_DATE" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={draft.startDate}
                onChange={(e) =>
                  setDraft({ ...draft, startDate: e.target.value })
                }
                aria-label="Start date"
                className="px-2 py-1.5 text-sm border border-border rounded-md"
              />
              <span className="text-text-disabled text-xs">to</span>
              <input
                type="date"
                value={draft.endDate}
                onChange={(e) =>
                  setDraft({ ...draft, endDate: e.target.value })
                }
                aria-label="End date"
                className="px-2 py-1.5 text-sm border border-border rounded-md"
              />
            </div>
          )}

          {draft.scheduleType === "HOLIDAY" && (
            <input
              placeholder="Holiday name (must match a Holiday entry, e.g. Diwali)"
              value={draft.holidayName}
              onChange={(e) =>
                setDraft({ ...draft, holidayName: e.target.value })
              }
              aria-label="Holiday name"
              className="w-full px-2 py-1.5 text-sm border border-border rounded-md"
            />
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">
              Status during this window:
            </span>
            <Select
              aria-label="Status during this window"
              value={draft.statusDuringPeriod}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  statusDuringPeriod: value as MenuItemStatus,
                })
              }
              options={MENU_ITEM_STATUS_OPTIONS}
              containerClassName="min-w-36"
              className="py-1 text-xs"
            />
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="text-xs text-text-secondary hover:text-text-primary px-2 py-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!canSave || createMutation.isPending}
              className="text-xs font-medium text-primary-foreground bg-primary hover:bg-primary-hover disabled:opacity-40 px-3 py-1 rounded-md"
            >
              {createMutation.isPending ? "Saving…" : "Add schedule"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setDraft(EMPTY_DRAFT)}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover"
        >
          <Plus className="w-3.5 h-3.5" /> Add schedule
        </button>
      )}
    </div>
  );
};
