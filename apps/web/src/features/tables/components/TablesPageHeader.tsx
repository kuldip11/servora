import { Button, PageHeader } from "@pos/ui";
import { Plus, QrCode } from "lucide-react";

type TablesPageHeaderProps = {
  visibleCount: number;
  totalCount: number;
  aggregate: boolean;
  takeawayQrBusy: boolean;
  canCreate: boolean;
  onOpenTakeawayQr: () => void;
  onAdd: () => void;
};

export const TablesPageHeader = ({
  visibleCount,
  totalCount,
  aggregate,
  takeawayQrBusy,
  canCreate,
  onOpenTakeawayQr,
  onAdd,
}: TablesPageHeaderProps) => (
  <PageHeader
    title="Tables"
    description={`${visibleCount} of ${totalCount} tables`}
    actions={
      <>
        {!aggregate && (
          <Button
            variant="secondary"
            onClick={onOpenTakeawayQr}
            disabled={takeawayQrBusy}
          >
            <QrCode className="w-4 h-4" />
            Takeaway QR
          </Button>
        )}
        {canCreate && (
          <Button onClick={onAdd}>
            <Plus className="w-4 h-4" />
            Add Table
          </Button>
        )}
      </>
    }
  />
);
