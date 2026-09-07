import { useRef, useState } from "react";
import { Upload, Download, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button, Dialog, IconButton, Table, type Column } from "@pos/ui";
import { notifyError } from "@/shared/lib/notify";
import {
  menuImportService,
  type ValidatedRow,
  type ValidateImportResponse,
} from "@/features/menu/services/menu-import.service";
import {
  useValidateMenuImport,
  useCommitMenuImport,
} from "@/features/menu/hooks/useMenuImport";

interface Props {
  onClose: () => void;
}

const PREVIEW_COLUMNS: Column<ValidatedRow>[] = [
  { id: "row", header: "Row", cell: (r) => r.row, width: "56px" },
  {
    id: "action",
    header: "Action",
    cell: (r) => (
      <span
        className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
          r.action === "insert"
            ? "bg-primary-surface text-primary"
            : "bg-warning-surface text-warning"
        }`}
      >
        {r.action}
      </span>
    ),
  },
  { id: "name", header: "Name", cell: (r) => r.data.name },
  { id: "price", header: "Price", cell: (r) => `₹${r.data.basePrice}` },
  {
    id: "status",
    header: "Status",
    cell: (r) => <span className="text-text-secondary">{r.data.status}</span>,
  },
];

export const ImportWizard = ({ onClose }: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ValidateImportResponse | null>(null);

  const validateMutation = useValidateMenuImport();
  const commitMutation = useCommitMenuImport();

  async function downloadTemplate(format: "csv" | "xlsx") {
    try {
      await menuImportService.downloadTemplate(format);
    } catch {
      notifyError(undefined, "Failed to download template");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    validateMutation.mutate(f, {
      onSuccess: (data) => setResult(data),
      onError: () => setFile(null),
    });
  }

  function handleCommit() {
    if (!file) return;
    commitMutation.mutate(file, { onSuccess: onClose });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Import menu items"
      size="xl"
      footer={
        file && result ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleCommit}
              loading={commitMutation.isPending}
              disabled={result.validCount === 0}
            >
              {commitMutation.isPending
                ? "Importing…"
                : `Import ${result.validCount} item(s)`}
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-text-secondary">New here?</span>
          <button
            type="button"
            onClick={() => downloadTemplate("csv")}
            className="flex items-center gap-1 text-primary hover:text-primary-hover font-medium"
          >
            <Download className="w-3.5 h-3.5" /> CSV template
          </button>
          <button
            type="button"
            onClick={() => downloadTemplate("xlsx")}
            className="flex items-center gap-1 text-primary hover:text-primary-hover font-medium"
          >
            <Download className="w-3.5 h-3.5" /> Excel template
          </button>
        </div>

        {!file && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-lg py-10 flex flex-col items-center gap-2 text-text-disabled hover:border-primary/40 hover:text-primary transition-colors duration-fast ease-standard"
          >
            <Upload className="w-6 h-6" />
            <span className="text-sm font-medium">
              Click to upload a CSV or Excel file
            </span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleFileChange}
        />

        {validateMutation.isPending && (
          <p className="text-sm text-text-secondary">Validating…</p>
        )}

        {}
        <div aria-live="polite" className="sr-only">
          {validateMutation.isPending
            ? "Validating file…"
            : file && result
              ? `${result.validCount} row${result.validCount === 1 ? "" : "s"} ready to import${
                  result.errors.length > 0
                    ? `, ${result.errors.length} row error${result.errors.length === 1 ? "" : "s"}`
                    : ""
                }`
              : ""}
        </div>

        {file && result && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary truncate">{file.name}</span>
              <IconButton
                icon={X}
                aria-label="Remove file"
                size="sm"
                onClick={() => {
                  setFile(null);
                  setResult(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              />
            </div>

            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-success font-medium">
                <CheckCircle2 className="w-4 h-4" /> {result.validCount} ready
                to import
              </span>
              {result.errors.length > 0 && (
                <span className="flex items-center gap-1 text-danger font-medium">
                  <AlertCircle className="w-4 h-4" /> {result.errors.length} row
                  error(s)
                </span>
              )}
            </div>

            {result.errors.length > 0 && (
              <div className="border border-danger/20 bg-danger-surface rounded-md max-h-40 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <div
                    key={i}
                    className="px-3 py-1.5 text-xs text-danger border-b border-danger/20 last:border-0"
                  >
                    Row {e.row}
                    {e.field ? ` (${e.field})` : ""}: {e.message}
                  </div>
                ))}
              </div>
            )}

            {result.preview.length > 0 && (
              <Table
                columns={PREVIEW_COLUMNS}
                data={result.preview}
                getRowId={(r) => String(r.row)}
                density="compact"
                maxHeight="14rem"
              />
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
};
