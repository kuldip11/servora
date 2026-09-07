import { Button, Input, Modal } from "@pos/ui";
import type { MenuItem } from "@pos/types";

interface ManualAvailabilityOverrideDialogProps {
  item: MenuItem;
  reason: string;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export const ManualAvailabilityOverrideDialog = ({
  item,
  reason,
  onReasonChange,
  onClose,
  onSubmit,
}: ManualAvailabilityOverrideDialogProps) => (
  <Modal open onClose={onClose} title={`Manually 86 ${item.name}`} size="sm">
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        This manual override stays in effect even if inventory or a schedule
        would otherwise make the item available.
      </p>
      <Input
        aria-label="Manual override reason"
        value={reason}
        onChange={(event) => onReasonChange(event.target.value)}
        placeholder="Reason (required)"
      />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!reason.trim()} onClick={onSubmit}>
          Mark out of stock
        </Button>
      </div>
    </div>
  </Modal>
);
