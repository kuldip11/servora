export const LeadFieldError = ({
  id,
  message,
}: {
  id: string;
  message?: string;
}) =>
  message ? (
    <span
      id={id}
      role="alert"
      className="mt-1 block text-xs text-[var(--danger)]"
    >
      {message}
    </span>
  ) : null;
