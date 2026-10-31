import { Edit2, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  QueryErrorState,
  Spinner,
  StaleDataBanner,
} from "@pos/ui";
import type { ModifierGroup } from "@pos/types";
import { formatCurrency } from "@/shared/utils";

type Props = {
  groups: ModifierGroup[] | undefined;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  onRetry: () => void;
  onCreate: () => void;
  onEdit: (group: ModifierGroup) => void;
  onDelete: (group: ModifierGroup) => void;
};

export const ModifierGroupList = ({
  groups,
  isLoading,
  isError,
  isFetching,
  onRetry,
  onCreate,
  onEdit,
  onDelete,
}: Props) => (
  <>
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          Modifier Groups
        </h2>
        <p className="mt-0.5 text-xs text-text-secondary">
          Reusable option sets like "Choose your sides" — define once, attach to
          any item.
        </p>
      </div>
      <Button size="sm" onClick={onCreate} disabled={isError && !groups}>
        <Plus className="h-3.5 w-3.5" /> New Group
      </Button>
    </div>

    {isError && groups ? (
      <StaleDataBanner
        message="Modifier group refresh failed — showing the last available data."
        onRetry={onRetry}
        isRetrying={isFetching}
      />
    ) : null}

    {isError && !groups ? (
      <QueryErrorState
        title="Unable to load modifier groups"
        description="Modifier groups could not be loaded. Retry before creating or editing groups."
        onRetry={onRetry}
        isRetrying={isFetching}
      />
    ) : isLoading ? (
      <div className="flex justify-center py-10">
        <Spinner className="h-5 w-5" />
      </div>
    ) : !groups?.length ? (
      <EmptyState
        icon={Plus}
        title="No modifier groups yet"
        description='Create one like "Choose your sides" or "Extras" to attach to menu items.'
        action={
          <Button onClick={onCreate}>
            <Plus className="h-4 w-4" /> New Group
          </Button>
        }
      />
    ) : (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {groups.map((group) => (
          <Card key={group.id}>
            <div className="mb-2 flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {group.name}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <Badge
                    variant={
                      group.selectionType === "SINGLE" ? "info" : "default"
                    }
                  >
                    {group.selectionType === "SINGLE"
                      ? "Pick one"
                      : "Pick multiple"}
                  </Badge>
                  {group.minSelections > 0 ? (
                    <Badge variant="warning">Required</Badge>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => onEdit(group)}
                  className="p-1.5 text-text-disabled hover:text-primary"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(group)}
                  className="p-1.5 text-text-disabled hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="space-y-1">
              {group.options.map((option) => (
                <div
                  key={option.id}
                  className="flex items-center justify-between text-xs text-text-secondary"
                >
                  <span
                    className={
                      !option.isAvailable
                        ? "line-through text-text-disabled"
                        : ""
                    }
                  >
                    {option.name}
                  </span>
                  <span>
                    {parseFloat(String(option.additionalPrice)) > 0
                      ? `+${formatCurrency(parseFloat(String(option.additionalPrice)))}`
                      : "Free"}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    )}
  </>
);
