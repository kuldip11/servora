import { Badge, Card } from "@pos/ui";
import type { ReactNode } from "react";

export type OperationalSeverity = "critical" | "warning" | "info" | "success";

export type OperationalAlert = {
  id: string;
  title: string;
  description: string;
  severity: OperationalSeverity;
  meta?: string;
  action?: ReactNode;
};

const badgeVariant = (severity: OperationalSeverity) => {
  if (severity === "critical") return "danger" as const;
  if (severity === "warning") return "warning" as const;
  if (severity === "success") return "success" as const;
  return "info" as const;
};

export const OperationalAlertCard = ({
  alert,
}: {
  alert: OperationalAlert;
}) => (
  <Card>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-text-primary">{alert.title}</h3>
          <Badge variant={badgeVariant(alert.severity)}>
            {alert.severity.toUpperCase()}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-text-secondary">{alert.description}</p>
        {alert.meta ? (
          <p className="mt-2 text-xs text-text-disabled">{alert.meta}</p>
        ) : null}
      </div>
      {alert.action}
    </div>
  </Card>
);
