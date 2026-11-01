import {
  createMenuApi,
  type MenuImportCommitDto,
  type MenuImportValidationDto,
} from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const menuApi = createMenuApi(apiClient);

export type ValidateImportResponse = MenuImportValidationDto;
export type CommitImportResponse = MenuImportCommitDto;
export type ValidatedRow = MenuImportValidationDto["preview"][number];

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const menuImportService = {
  async downloadTemplate(format: "csv" | "xlsx"): Promise<void> {
    const blob = await menuApi.downloadImportTemplate(format);
    triggerDownload(blob, `menu-items-template.${format}`);
  },

  async validate(file: File): Promise<ValidateImportResponse> {
    const form = new FormData();
    form.append("file", file);
    return menuApi.validateImport(form);
  },

  async commit(file: File): Promise<CommitImportResponse> {
    const form = new FormData();
    form.append("file", file);
    return menuApi.commitImport(form);
  },
};
