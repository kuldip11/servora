import type { ReactNode } from "react";
import { BottomSheet, Select } from "@pos/ui";
import { COURSE_OPTIONS } from "@/features/menu/constants";
import { CartLines, courseLabel } from "./CartLines";
import { CartCheckout } from "./CartCheckout";
import type {
  CartSummaryProps,
  CourseControl,
  LineCourses,
} from "./cart-summary.types";

const CourseToggle = ({
  courses,
  children,
}: {
  courses: CourseControl;
  children?: ReactNode;
}) =>
  courses.available ? (
    <div className="rounded-xl border border-border bg-surface-secondary p-3">
      <label className="flex items-center gap-2 text-sm text-text-secondary">
        <input
          type="checkbox"
          checked={courses.enabled}
          onChange={(event) => courses.setEnabled(event.target.checked)}
        />
        <span>
          <strong className="text-text-primary">Course mode</strong> — later
          courses wait until the prior course is served.
        </span>
      </label>
      {children}
    </div>
  ) : null;

const CartSheet = ({
  cart,
  actions,
  checkout,
  title,
  notesPlaceholder,
  submitLabel,
  needsTable,
  courseControls,
  lineCourses,
}: CartSummaryProps & {
  title: string;
  notesPlaceholder: string;
  submitLabel: string;
  needsTable?: boolean | undefined;
  courseControls: ReactNode;
  lineCourses?: LineCourses | undefined;
}) => (
  <BottomSheet
    open
    onClose={checkout.close}
    title={title}
    footer={
      <CartCheckout
        state={cart}
        checkout={checkout}
        notesPlaceholder={notesPlaceholder}
        submitLabel={submitLabel}
        needsTable={needsTable}
      />
    }
  >
    <div className="space-y-4">
      {courseControls}
      <CartLines state={cart} actions={actions} lineCourses={lineCourses} />
    </div>
  </BottomSheet>
);

export const NewOrderCartSummary = ({
  courses,
  needsTable,
  ...props
}: CartSummaryProps & {
  courses: CourseControl & LineCourses;
  needsTable: boolean;
}) => (
  <CartSheet
    {...props}
    title="Cart"
    notesPlaceholder="Order notes…"
    submitLabel="Place Order"
    needsTable={needsTable}
    courseControls={<CourseToggle courses={courses} />}
    lineCourses={courses.enabled ? courses : undefined}
  />
);

export const AddRoundCartSummary = ({
  courses,
  ...props
}: CartSummaryProps & {
  courses: CourseControl & {
    roundNumber: number;
    setRoundNumber: (course: number) => void;
  };
}) => (
  <CartSheet
    {...props}
    title="Adding to Order"
    notesPlaceholder="Notes for this round…"
    submitLabel="Add to Order"
    courseControls={
      <CourseToggle courses={courses}>
        {courses.enabled ? (
          <div className="mt-3">
            <Select
              label="This round"
              value={String(courses.roundNumber)}
              onChange={(value) => courses.setRoundNumber(Number(value))}
              className="rounded-xl"
              options={COURSE_OPTIONS.map((course) => ({
                value: String(course),
                label: courseLabel(course),
              }))}
            />
          </div>
        ) : null}
      </CourseToggle>
    }
  />
);
