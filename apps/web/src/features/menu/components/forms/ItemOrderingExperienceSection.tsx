import { Button, Input, Select } from "@pos/ui";
import type { useItemFormWorkflow } from "@/features/menu/hooks/useItemFormWorkflow";
import type { useModifierGroups } from "@/features/menu/hooks/useModifierGroups";

type Workflow = ReturnType<typeof useItemFormWorkflow>;
type Groups = NonNullable<ReturnType<typeof useModifierGroups>["data"]>;

export const ItemOrderingExperienceSection = ({
  workflow,
  groups,
}: {
  workflow: Workflow;
  groups: Groups;
}) => {
  const {
    displayMode,
    effectiveFrom,
    setDisplayMode,
    setEffectiveFrom,
    setSelectedGroupIds,
  } = workflow;

  return (
    <div className="rounded border border-border p-3 space-y-2">
      <Select
        label="Ordering experience"
        value={displayMode}
        options={[
          { value: "STANDARD", label: "Standard item" },
          { value: "GUIDED_BUILDER", label: "Guided build-your-own" },
        ]}
        onChange={(value) =>
          setDisplayMode(value as "STANDARD" | "GUIDED_BUILDER")
        }
      />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => {
          setDisplayMode("GUIDED_BUILDER");
          setSelectedGroupIds(
            groups
              .filter((group) => group.minSelections > 0)
              .map((group) => group.id),
          );
        }}
      >
        Apply Build-Your-Own preset
      </Button>
      <Input
        label="Effective from (optional)"
        type="datetime-local"
        value={effectiveFrom}
        onChange={(event) => setEffectiveFrom(event.target.value)}
      />
      {effectiveFrom && new Date(effectiveFrom) > new Date() && (
        <p className="text-xs text-warning">
          Pending publish · live {new Date(effectiveFrom).toLocaleString()}
        </p>
      )}
    </div>
  );
};
