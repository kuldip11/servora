import { type TextareaHTMLAttributes, forwardRef, useState } from "react";
import { cn } from "../../utils/cn";
import {
  FieldLabel,
  FieldFooter,
  fieldBaseClasses,
  useFieldIds,
  describedBy,
} from "./shared";

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string | undefined;
  hint?: string | undefined;
  error?: string | undefined;
  required?: boolean | undefined;

  showCharCount?: boolean | undefined;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      label,
      hint,
      error,
      required,
      showCharCount,
      className,
      id,
      maxLength,
      value,
      defaultValue,
      onChange,
      rows = 4,
      ...props
    },
    ref,
  ) => {
    const { fieldId, hintId, errorId } = useFieldIds(id);
    const isControlled = value !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = useState(
      defaultValue ?? "",
    );
    const currentLength = String(
      isControlled ? value : uncontrolledValue,
    ).length;

    return (
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor={fieldId} required={required}>
          {label}
        </FieldLabel>
        <textarea
          ref={ref}
          id={fieldId}
          rows={rows}
          className={cn(
            fieldBaseClasses(!!error),
            "px-3 py-2.5 resize-y",
            className,
          )}
          maxLength={maxLength}
          value={value}
          defaultValue={isControlled ? undefined : defaultValue}
          onChange={(e) => {
            if (!isControlled) setUncontrolledValue(e.target.value);
            onChange?.(e);
          }}
          aria-required={required || undefined}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy(hintId, errorId, hint, error)}
          {...props}
        />
        <FieldFooter
          hint={hint}
          error={error}
          hintId={hintId}
          errorId={errorId}
          charCount={showCharCount ? currentLength : undefined}
          maxLength={maxLength}
        />
      </div>
    );
  },
);
TextArea.displayName = "TextArea";
