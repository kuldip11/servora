import { Button, TextInput } from "@pos/ui";
import { COURSE_LABELS } from "@/features/menu/constants";

interface ItemCustomiserMetaFieldsProps {
  courseMode: boolean;
  course: 1 | 2 | 3;
  seatLabel: string;
  chefNotes: string;
  onCourse: (course: 1 | 2 | 3) => void;
  onSeatLabel: (value: string) => void;
  onChefNotes: (value: string) => void;
}

export const ItemCustomiserMetaFields = ({
  courseMode,
  course,
  seatLabel,
  chefNotes,
  onCourse,
  onSeatLabel,
  onChefNotes,
}: ItemCustomiserMetaFieldsProps) => (
  <>
    {courseMode && (
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Course
        </p>
        <div className="flex gap-2">
          {([1, 2, 3] as const).map((value) => (
            <Button
              type="button"
              variant="secondary"
              key={value}
              onClick={() => onCourse(value)}
              className={`flex-1 rounded-xl border-2 py-2.5 text-xs font-semibold ${course === value ? "border-primary bg-primary-surface text-primary" : "border-border text-text-secondary"}`}
            >
              {COURSE_LABELS[value]}
            </Button>
          ))}
        </div>
      </div>
    )}
    <TextInput
      label="Seat / diner (optional)"
      placeholder="e.g. Seat 1 or Priya"
      value={seatLabel}
      onChange={(event) => onSeatLabel(event.target.value)}
    />
    <TextInput
      label="Note for Chef"
      placeholder="e.g. no onion, extra spicy…"
      value={chefNotes}
      onChange={(event) => onChefNotes(event.target.value)}
      className="rounded-xl bg-surface-secondary"
    />
  </>
);
