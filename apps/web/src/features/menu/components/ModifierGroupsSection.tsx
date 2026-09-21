import { useState } from "react";
import type { ModifierGroup } from "@pos/types";
import type { ModifierGroupFormValues } from "@pos/validation";
import { useModifierGroups } from "@/features/menu/hooks/useModifierGroups";
import { useSaveModifierGroup } from "@/features/menu/hooks/useSaveModifierGroup";
import { useDeleteModifierGroup } from "@/features/menu/hooks/useDeleteModifierGroup";
import { ModifierGroupList } from "./ModifierGroupList";
import {
  ModifierGroupFormModal,
  type EMPTY_MODIFIER_GROUP,
} from "./ModifierGroupFormModal";

const toPayload = (values: ModifierGroupFormValues) => ({
  name: values.name.trim(),
  selectionType: values.selectionType,
  groupType: values.groupType,
  minSelections: Number(values.minSelections),
  ...(values.maxSelections !== "" && {
    maxSelections: Number(values.maxSelections),
  }),
  dependsOnOptionId: values.dependsOnOptionId ?? null,
  options: values.options.map((option) => ({
    ...(option.id ? { id: option.id } : {}),
    name: option.name.trim(),
    additionalPrice: Number(option.additionalPrice),
    maxQuantity: Number(option.maxQuantity),
    isDefault: option.isDefault ?? false,
    ...(option.replacesDefaultComponent?.trim()
      ? { replacesDefaultComponent: option.replacesDefaultComponent.trim() }
      : {}),
  })),
});

export const ModifierGroupsSection = () => {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ModifierGroup | null>(null);
  const groupsQuery = useModifierGroups();
  const groups = groupsQuery.data;
  const saveMutation = useSaveModifierGroup();
  const deleteMutation = useDeleteModifierGroup();

  const openCreate = () => {
    setEditing(null);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <ModifierGroupList
        groups={groups}
        isLoading={groupsQuery.isLoading}
        isError={groupsQuery.isError}
        isFetching={groupsQuery.isFetching}
        onRetry={() => void groupsQuery.refetch()}
        onCreate={openCreate}
        onEdit={(group) => {
          setEditing(group);
          setShowForm(true);
        }}
        onDelete={(group) => {
          if (confirm(`Delete "${group.name}"?`))
            deleteMutation.mutate(group.id);
        }}
      />

      <ModifierGroupFormModal
        key={editing?.id ?? "new"}
        open={showForm}
        editing={editing}
        groups={groups ?? []}
        isSaving={saveMutation.isPending}
        dependencyBlocked={groupsQuery.isError && !groups}
        onClose={() => {
          setShowForm(false);
          setEditing(null);
        }}
        onSave={async (current, values, onError) => {
          try {
            await saveMutation.mutateAsync({
              existingId: current?.id ?? null,
              payload: toPayload(values),
            });
            setShowForm(false);
            setEditing(null);
          } catch (error) {
            onError(error, () => undefined as never);
            throw error;
          }
        }}
      />
    </div>
  );
};
