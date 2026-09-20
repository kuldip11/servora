import { AlertTriangle } from "lucide-react";
import { cn } from "../utils/cn";

export interface FormErrorSummaryProps {
  title?: string | undefined;
  messages: readonly string[];
  className?: string | undefined;
}

export const FormErrorSummary = ({
  title = "Please review the form",
  messages,
  className,
}: FormErrorSummaryProps) => {
  const visibleMessages = [
    ...new Set(messages.map((message) => message.trim())),
  ].filter(Boolean);

  if (!visibleMessages.length) return null;

  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border border-danger/30 bg-danger-surface p-3 text-sm",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-danger"
        />
        <div>
          <p className="font-semibold text-text-primary">{title}</p>
          {visibleMessages.length === 1 ? (
            <p className="mt-1 text-text-secondary">{visibleMessages[0]}</p>
          ) : (
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-text-secondary">
              {visibleMessages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
