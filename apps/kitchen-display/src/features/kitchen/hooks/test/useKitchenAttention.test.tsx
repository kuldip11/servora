import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callbacks: new Map<string, (event: { payload: unknown }) => void>(),
  toast: vi.fn(),
  voidAlerts: true,
  filtered: undefined as unknown,
  filterEnabled: false,
}));

vi.mock("@/shared/lib/realtime", () => ({
  useRealtimeEvent: (
    type: string,
    callback: (event: { payload: unknown }) => void,
  ) => {
    mocks.callbacks.set(type, callback);
  },
}));
vi.mock("@pos/ui", () => ({ toast: mocks.toast }));
vi.mock("@/features/kitchen/utils/ticket", () => ({
  filterTicketForStation: (ticket: unknown) =>
    mocks.filterEnabled ? mocks.filtered : ticket,
}));
vi.mock("@/features/kitchen/terminal-storage", () => ({
  getVoidAlertsEnabled: () => mocks.voidAlerts,
}));

import { useKitchenAttention } from "../useKitchenAttention";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const HookHost = ({ stationId }: { stationId?: string }) => {
  useKitchenAttention(stationId);
  return null;
};

describe("useKitchenAttention", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot> | undefined;

  beforeEach(async () => {
    mocks.callbacks.clear();
    mocks.toast.mockReset();
    mocks.voidAlerts = true;
    mocks.filtered = undefined;
    mocks.filterEnabled = false;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => root!.render(<HookHost stationId="station-1" />));
  });

  afterEach(async () => {
    if (root) await act(async () => root!.unmount());
    root = undefined;
    container.remove();
  });

  it("announces newly created active tickets with table context", () => {
    mocks.callbacks.get("kitchen.ticket.created")?.({
      payload: { status: "PENDING", order: { table: { name: "12" } } },
    });
    expect(mocks.toast).toHaveBeenCalledWith({
      title: "New ticket · Table 12",
      tone: "info",
      duration: 3000,
    });
  });

  it("ignores held or station-filtered tickets and uses a generic title without a table", () => {
    mocks.callbacks.get("kitchen.ticket.created")?.({
      payload: { status: "HELD" },
    });
    expect(mocks.toast).not.toHaveBeenCalled();

    mocks.filterEnabled = true;
    mocks.filtered = null;
    mocks.callbacks.get("kitchen.ticket.created")?.({
      payload: { status: "PENDING" },
    });
    expect(mocks.toast).not.toHaveBeenCalled();

    mocks.filtered = undefined;
    mocks.filterEnabled = false;
    mocks.callbacks.get("kitchen.ticket.created")?.({
      payload: { status: "PENDING" },
    });
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "New kitchen ticket" }),
    );
  });

  it("raises urgent and warning void alerts only when alerts are enabled", () => {
    mocks.callbacks.get("order.item.voided")?.({
      payload: { status: "PREPARING" },
    });
    expect(mocks.toast).toHaveBeenLastCalledWith({
      title: "URGENT VOID · stop preparation",
      tone: "danger",
      duration: 6000,
    });

    mocks.callbacks.get("order.item.voided")?.({
      payload: { status: "PENDING" },
    });
    expect(mocks.toast).toHaveBeenLastCalledWith({
      title: "Item voided before preparation",
      tone: "warning",
      duration: 6000,
    });

    mocks.callbacks.get("order.item.voided")?.({
      payload: { status: "READY" },
    });
    expect(mocks.toast).toHaveBeenLastCalledWith({
      title: "URGENT VOID · stop preparation",
      tone: "danger",
      duration: 6000,
    });

    mocks.filterEnabled = true;
    mocks.filtered = null;
    mocks.toast.mockClear();
    mocks.callbacks.get("order.item.voided")?.({ payload: { status: "FIRED" } });
    expect(mocks.toast).not.toHaveBeenCalled();

    mocks.filterEnabled = false;
    mocks.voidAlerts = false;
    mocks.callbacks.get("order.item.voided")?.({
      payload: { status: "READY" },
    });
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it("ignores callbacks after unmount", async () => {
    const created = mocks.callbacks.get("kitchen.ticket.created")!;
    const voided = mocks.callbacks.get("order.item.voided")!;
    await act(async () => root!.unmount());
    root = undefined;
    created({ payload: { status: "FIRED" } });
    voided({ payload: { status: "PREPARING" } });
    expect(mocks.toast).not.toHaveBeenCalled();
  });
});
