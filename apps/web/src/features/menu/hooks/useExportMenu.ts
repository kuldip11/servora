import { useState } from "react";
import { notifyError } from "@/shared/lib/notify";
import {
  menuExportService,
  type MenuExportEntity,
  type MenuExportFormat,
} from "@/features/menu/services/menu-export.service";

export const useExportMenu = () => {
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  async function download(entity: MenuExportEntity, format: MenuExportFormat) {
    const key = `${entity}-${format}`;
    setDownloadingKey(key);
    try {
      await menuExportService.download(entity, format);
    } catch (error) {
      notifyError(error, `Failed to export ${entity}`);
    } finally {
      setDownloadingKey(null);
    }
  }

  return { download, downloadingKey };
};
