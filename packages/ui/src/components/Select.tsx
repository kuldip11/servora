import { SelectHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "../utils/cn";
import { FieldLabel } from "./form/shared";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string | undefined;
  options: readonly { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id, required, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const errorId = `${selectId}-error`;
    return (
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor={selectId} required={required}>
          {label}
        </FieldLabel>
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "block w-full px-3 py-2.5 text-sm text-text-primary bg-surface border rounded-md",
            "focus:outline-none focus:ring-2 focus:border-transparent transition-colors duration-fast ease-standard",
            error
              ? "border-danger focus:ring-danger"
              : "border-border focus:ring-primary",
            className,
          )}
          {...props}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={errorId} role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Select.displayName = "Select";
