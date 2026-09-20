import {
  type ComponentType,
  type InputHTMLAttributes,
  type ReactNode,
  forwardRef,
  useState,
} from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../utils/cn";
import {
  FieldLabel,
  FieldFooter,
  fieldBaseClasses,
  useFieldIds,
  describedBy,
} from "./shared";

export interface TextInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "prefix"
> {
  label?: string | undefined;
  hint?: string | undefined;
  error?: string | undefined;
  required?: boolean | undefined;

  prefix?: ReactNode | undefined;

  suffix?: ReactNode | undefined;

  icon?: ComponentType<{ className?: string }> | undefined;

  loading?: boolean | undefined;

  showCharCount?: boolean | undefined;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      label,
      hint,
      error,
      required,
      prefix,
      suffix,
      icon: Icon,
      loading,
      showCharCount,
      className,
      id,
      maxLength,
      value,
      defaultValue,
      onChange,
      disabled,
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

    const hasLeading = !!Icon || !!prefix;
    const hasTrailing = !!suffix || !!loading;

    return (
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor={fieldId} required={required}>
          {label}
        </FieldLabel>
        <div className="relative flex items-center">
          {Icon ? (
            <Icon className="pointer-events-none absolute left-3 w-4 h-4 text-text-secondary" />
          ) : (
            prefix && (
              <span className="pointer-events-none absolute left-3 text-sm text-text-secondary">
                {prefix}
              </span>
            )
          )}
          <input
            ref={ref}
            id={fieldId}
            className={cn(
              fieldBaseClasses(!!error),
              "px-3 py-2.5",
              hasLeading && "pl-9",
              hasTrailing && "pr-9",
              className,
            )}
            maxLength={maxLength}
            value={value}
            defaultValue={isControlled ? undefined : defaultValue}
            onChange={(e) => {
              if (!isControlled) setUncontrolledValue(e.target.value);
              onChange?.(e);
            }}
            disabled={disabled || loading}
            aria-required={required || undefined}
            aria-invalid={!!error || undefined}
            aria-describedby={describedBy(hintId, errorId, hint, error)}
            {...props}
          />
          {loading && (
            <Loader2 className="absolute right-3 w-4 h-4 animate-spin text-text-secondary" />
          )}
          {!loading && suffix && (
            <span className="absolute right-3 text-sm text-text-secondary">
              {suffix}
            </span>
          )}
        </div>
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
TextInput.displayName = "TextInput";

export const Input = TextInput;
export type InputProps = TextInputProps;
