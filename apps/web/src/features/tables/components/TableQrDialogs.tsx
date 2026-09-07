import { Button, Modal } from "@pos/ui";
import { QRCodeSVG } from "qrcode.react";
import { appUrls } from "@/config/app-urls";
import type { RestaurantTable } from "@/features/tables/types";

export function TakeawayQrModal({
  data,
  open,
  onClose,
  onRegenerate,
  busy,
}: {
  data: {
    branchId: string;
    branchName: string;
    enabled: boolean;
    token: string;
  } | null;
  open: boolean;
  onClose: () => void;
  onRegenerate: () => void;
  busy: boolean;
}) {
  if (!data) return null;
  const customerAppUrl = appUrls.customer;
  const url = `${customerAppUrl.replace(/\/$/, "")}/?qr=${encodeURIComponent(data.token)}`;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${data.branchName} — Takeaway QR`}
      size="sm"
      description="A public ordering QR for takeaway customers. It is not linked to a physical table."
      footer={
        <>
          <Button variant="secondary" onClick={onRegenerate} disabled={busy}>
            {busy ? "Updating…" : "Regenerate"}
          </Button>
          <Button onClick={() => window.print()} disabled={!data.enabled}>
            Print QR
          </Button>
        </>
      }
    >
      {!data.enabled ? (
        <div className="rounded-lg border border-warning bg-warning-surface p-4 text-sm text-warning">
          Takeaway ordering is disabled for this branch. Enable Takeaway in
          branch settings before publishing this QR.
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm print:shadow-none">
            <QRCodeSVG value={url} size={240} level="M" includeMargin />
          </div>
          <div>
            <p className="font-semibold text-text-primary">
              Scan to order takeaway
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              Customers can order without selecting a table.
            </p>
          </div>
          <div className="w-full rounded-lg bg-surface-secondary p-3 text-left">
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-disabled">
              Customer URL
            </p>
            <p className="mt-1 break-all text-xs text-text-secondary">{url}</p>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function TableQrModal({
  table,
  open,
  onClose,
  onRegenerate,
  regenerating,
}: {
  table: RestaurantTable | null;
  open: boolean;
  onClose: () => void;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  if (!table) return null;
  const customerAppUrl = appUrls.customer;
  const url = `${customerAppUrl.replace(/\/$/, "")}/?qr=${encodeURIComponent(table.publicQrToken)}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${table.name} — Customer QR`}
      size="sm"
      description="Scan this QR code to open the Servora customer self-ordering menu for this table."
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onRegenerate}
            disabled={regenerating}
          >
            {regenerating ? "Regenerating…" : "Regenerate"}
          </Button>
          <Button onClick={() => window.print()}>Print QR</Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm print:shadow-none">
          <QRCodeSVG value={url} size={240} level="M" includeMargin />
        </div>
        <div>
          <p className="font-semibold text-text-primary">
            Scan to order from your table
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            {table.section ? `${table.section} · ` : ""}
            {table.name} · {table.capacity} seats
          </p>
        </div>
        <div className="w-full rounded-lg bg-surface-secondary p-3 text-left">
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-disabled">
            Customer URL
          </p>
          <p className="mt-1 break-all text-xs text-text-secondary">{url}</p>
        </div>
      </div>
    </Modal>
  );
}
