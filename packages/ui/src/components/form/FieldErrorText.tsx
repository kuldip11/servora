import { cn } from "../../utils/cn";

export interface FieldErrorTextProps {
  message?: string | undefined;
  id?: string | undefined;
  className?: string | undefined;
}

export const FieldErrorText = ({
  message,
  id,
  className,
}: FieldErrorTextProps) =>
  message ? (
    <p id={id} className={cn("mt-1 text-xs text-danger", className)}>
      {message}
    </p>
  ) : null;
