import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppBootstrap } from "@/shared/components/AppBootstrap";
import { bootstrapAuthSession } from "@/shared/auth/bootstrap";

vi.mock("@/shared/auth/bootstrap", () => ({
  bootstrapAuthSession: vi.fn(),
}));

describe("AppBootstrap", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(bootstrapAuthSession).mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it("shows startup UI immediately and reveals the app when auth is ready", async () => {
    let resolveBootstrap: (value: "ready") => void = () => undefined;
    vi.mocked(bootstrapAuthSession).mockReturnValue(
      new Promise<"ready">((resolve) => {
        resolveBootstrap = resolve;
      }),
    );

    await act(async () => {
      root.render(
        <AppBootstrap>
          <div>dashboard</div>
        </AppBootstrap>,
      );
    });

    expect(container.textContent).toContain("Preparing your workspace");
    expect(container.textContent).not.toContain("dashboard");

    await act(async () => {
      resolveBootstrap("ready");
      await Promise.resolve();
    });

    expect(container.textContent).toContain("dashboard");
  });

  it("switches to the slower-start message after four seconds", async () => {
    vi.mocked(bootstrapAuthSession).mockReturnValue(
      new Promise<never>(() => undefined),
    );

    await act(async () => {
      root.render(
        <AppBootstrap>
          <div>dashboard</div>
        </AppBootstrap>,
      );
    });

    await act(async () => {
      vi.advanceTimersByTime(4_000);
    });

    expect(container.textContent).toContain("Connecting to Servora services");
    expect(container.textContent).toContain("taking a little longer than usual");
  });

  it("shows a retry state and retries unavailable bootstrap", async () => {
    vi.mocked(bootstrapAuthSession)
      .mockResolvedValueOnce("unavailable")
      .mockResolvedValueOnce("ready");

    await act(async () => {
      root.render(
        <AppBootstrap>
          <div>dashboard</div>
        </AppBootstrap>,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Unable to connect");

    const retry = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Try again"),
    );
    expect(retry).toBeTruthy();

    await act(async () => {
      retry?.click();
      await Promise.resolve();
    });

    expect(bootstrapAuthSession).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain("dashboard");
  });
});
