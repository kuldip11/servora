import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card } from "@pos/ui";
import { DASHBOARD_QUICK_ACTIONS } from "@/features/analytics/constants";
export const DashboardQuickActions = () => (
  <Card>
    <div className="mb-4">
      <h2 className="text-base font-semibold text-text-primary">
        Quick actions
      </h2>
      <p className="mt-1 text-xs text-text-secondary">
        Jump straight into the workflows owners and managers use most.
      </p>
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {DASHBOARD_QUICK_ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.label}
            to={action.to}
            search={("search" in action ? action.search : undefined) as never}
            className="group flex items-center gap-3 rounded-lg border border-border p-4 transition-all duration-fast ease-standard hover:border-primary/30 hover:bg-primary-surface/30"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-secondary text-text-secondary transition-colors group-hover:bg-primary-surface group-hover:text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <span className="flex-1 text-sm font-medium text-text-primary">
              {action.label}
            </span>
            <ArrowRight className="h-4 w-4 text-text-disabled transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        );
      })}
    </div>
  </Card>
);
