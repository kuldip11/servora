import { createRoot } from "react-dom/client";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { useExportMenu } from "@/features/menu/hooks/useExportMenu";
import { menuExportService } from "@/features/menu/services/menu-export.service";
import { notifyError } from "@/shared/lib/notify";

vi.mock("@/shared/lib/notify", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));
vi.mock("@/features/menu/services/menu-export.service", () => ({
  menuExportService: { download: vi.fn() },
}));

function renderHook<T>(hook: () => T) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let value!: T;
  function Probe() {
    value = hook();
    return null;
  }
  const root = createRoot(container);
  act(() => root.render(<Probe />));
  return {
    get result() {
      return value;
    },
    rerender: () => act(() => root.render(<Probe />)),
    unmount: () => act(() => root.unmount()),
  };
}

describe("browser utility hooks", () => {
  it("handles export success and failure states", async () => {
    const download = vi.mocked(menuExportService.download);
    let resolveDownload!: () => void;
    download.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveDownload = resolve;
        }),
    );
    const hook = renderHook(() => useExportMenu());
    let promise: Promise<void>;
    act(() => {
      promise = hook.result.download("items", "csv");
    });
    hook.rerender();
    expect(hook.result.downloadingKey).toBe("items-csv");
    await act(async () => {
      resolveDownload();
      await promise;
    });
    expect(hook.result.downloadingKey).toBeNull();
    expect(download).toHaveBeenCalledWith("items", "csv");

    download.mockRejectedValueOnce(new Error("download failed"));
    await act(async () => {
      await hook.result.download("categories", "xlsx");
    });
    expect(vi.mocked(notifyError)).toHaveBeenCalledWith(
      undefined,
      "Failed to export categories",
    );
    expect(hook.result.downloadingKey).toBeNull();
    hook.unmount();
  });
});
