import { useState } from "react";
import { Download } from "lucide-react";
import { Popover } from "@pos/ui";
import { useExportMenu } from "@/features/menu/hooks/useExportMenu";
import type {
  MenuExportEntity,
  MenuExportFormat,
} from "@/features/menu/services/menu-export.service";

const ENTITIES: { value: MenuExportEntity; label: string }[] = [
  { value: "items", label: "Items" },
  { value: "categories", label: "Categories" },
  { value: "recipes", label: "Recipes" },
  { value: "modifiers", label: "Modifiers" },
];

export const ExportMenu = () => {
  const [open, setOpen] = useState(false);
  const { download, downloadingKey } = useExportMenu();

  async function handleDownload(
    entity: MenuExportEntity,
    format: MenuExportFormat,
  ) {
    await download(entity, format);
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="end"
      trigger={
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-text-secondary border border-border rounded-md hover:border-primary/40 hover:text-primary transition-colors"
        >
          <Download className="w-4 h-4" /> Export
        </button>
      }
    >
      {}
      <div className="w-64 -m-4 p-2">
        {ENTITIES.map((e) => (
          <div
            key={e.value}
            className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-surface-secondary"
          >
            <span className="text-sm text-text-primary">{e.label}</span>
            <div className="flex gap-1">
              {(["csv", "xlsx"] as MenuExportFormat[]).map((format) => {
                const key = `${e.value}-${format}`;
                return (
                  <button
                    type="button"
                    key={format}
                    onClick={() => handleDownload(e.value, format)}
                    disabled={downloadingKey === key}
                    className="text-xs font-medium text-primary hover:opacity-80 disabled:opacity-40 px-1.5 py-0.5 rounded uppercase"
                  >
                    {downloadingKey === key ? "…" : format}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Popover>
  );
};
