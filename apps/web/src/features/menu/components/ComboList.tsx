import { Button } from "@pos/ui";
import type { ComboSummary } from "./combo-types";

type Props = {
  combos: ComboSummary[] | undefined;
  deletingId?: string | undefined;
  onEdit: (combo: ComboSummary) => void;
  onDelete: (combo: ComboSummary) => void;
};

export const ComboList = ({ combos, deletingId, onEdit, onDelete }: Props) => (
  <div className="space-y-2">
    {combos?.map((combo) => (
      <div
        key={combo.id}
        className="flex items-center gap-3 rounded border border-border p-3"
      >
        <div className="min-w-0 flex-1">
          <strong>{combo.name}</strong>
          <span className="ml-2 text-sm text-text-secondary">
            {combo.pricePolicy} · {combo.slots.length} slot(s)
          </span>
          {combo.slots.some((slot) =>
            slot.options.some((option) => option.isUnlimitedRefill),
          ) ? (
            <span className="ml-2 rounded bg-success-surface px-2 py-0.5 text-xs font-medium text-success">
              Refill-enabled
            </span>
          ) : null}
        </div>
        <Button size="sm" variant="secondary" onClick={() => onEdit(combo)}>
          Edit
        </Button>
        <Button
          size="sm"
          variant="secondary"
          loading={deletingId === combo.id}
          onClick={() => onDelete(combo)}
        >
          Delete
        </Button>
      </div>
    ))}
  </div>
);
