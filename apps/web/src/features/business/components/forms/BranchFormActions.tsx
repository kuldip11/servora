import { Button } from "@pos/ui";

export const BranchFormActions = ({
  showArchive,
  isArchiving,
  onArchive,
  onClose,
  isSaving,
  canSave,
}: {
  showArchive: boolean;
  isArchiving: boolean;
  onArchive: () => void;
  onClose: () => void;
  isSaving: boolean;
  canSave: boolean;
}) => (
  <div className="flex justify-between gap-2">
    {showArchive ? (
      <Button
        type="button"
        variant="danger"
        loading={isArchiving}
        onClick={onArchive}
      >
        Deactivate
      </Button>
    ) : (
      <span />
    )}
    <div className="flex gap-2">
      <Button type="button" variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button type="submit" loading={isSaving} disabled={!canSave}>
        {isSaving ? "Saving…" : "Save Branch"}
      </Button>
    </div>
  </div>
);
