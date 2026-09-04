import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { KitchenTicket } from "@pos/types";
import { ticket } from "@/features/kitchen/test/fixtures";

const mocks = vi.hoisted(() => ({
  stations: undefined as undefined | Array<{ id: string; name: string }>,
  tickets: undefined as undefined | KitchenTicket[],
  isLoading: false,
  isFetching: false,
  connected: false,
  isPending: false,
  variables: undefined as undefined | { id: string; status: string },
  refetch: vi.fn(),
  mutate: vi.fn(),
  onLogout: vi.fn(),
  stationArgs: [] as Array<string | undefined>,
  realtimeArgs: [] as Array<string | undefined>,
  attentionArgs: [] as Array<string | undefined>,
  getTerminalStationId: vi.fn<() => string | undefined>(() => undefined),
  getVoidAlertsEnabled: vi.fn(() => true),
  setTerminalStationId: vi.fn(),
  setVoidAlertsEnabled: vi.fn(),
  cardProps: [] as any[],
}));

vi.mock("@pos/ui", () => ({
  Grid: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  IconButton: ({ icon: _icon, ...props }: any) => <button {...props} />,
  Spinner: (props: any) => <span {...props}>loading</span>,
  EmptyState: ({ title }: any) => <span>{title}</span>,
  Popover: ({ trigger, children }: any) => <div>{trigger}{children}</div>,
  ThemeSwitcher: ({ label }: any) => <span>{label}</span>,
}));
vi.mock("@/features/kitchen/hooks/useKitchenTickets", () => ({
  useKitchenStations: () => ({ data: mocks.stations }),
  useKitchenTickets: (stationId?: string) => {
    mocks.stationArgs.push(stationId);
    return {
      data: mocks.tickets,
      isLoading: mocks.isLoading,
      isFetching: mocks.isFetching,
      refetch: mocks.refetch,
    };
  },
}));
vi.mock("@/features/kitchen/hooks/useUpdateTicketStatus", () => ({
  useUpdateTicketStatus: () => ({
    isPending: mocks.isPending,
    variables: mocks.variables,
    mutate: mocks.mutate,
  }),
}));
vi.mock("@/features/kitchen/hooks/useKitchenRealtime", () => ({
  useKitchenRealtime: (stationId?: string) => {
    mocks.realtimeArgs.push(stationId);
    return { connected: mocks.connected };
  },
}));
vi.mock("@/features/kitchen/hooks/useKitchenAttention", () => ({
  useKitchenAttention: (stationId?: string) => mocks.attentionArgs.push(stationId),
}));
vi.mock("@/features/kitchen/terminal-storage", () => ({
  getTerminalStationId: mocks.getTerminalStationId,
  getVoidAlertsEnabled: mocks.getVoidAlertsEnabled,
  setTerminalStationId: mocks.setTerminalStationId,
  setVoidAlertsEnabled: mocks.setVoidAlertsEnabled,
}));
vi.mock("@/features/kitchen/components/TicketCard", () => ({
  TicketCard: (props: any) => {
    mocks.cardProps.push(props);
    return (
      <button
        data-ticket={props.ticket.id}
        data-updating={String(props.isUpdating)}
        onClick={() => props.onUpdateStatus(props.ticket.id, "PREPARING")}
      >
        {props.ticket.id}
      </button>
    );
  },
}));

import { KitchenBoard } from "@/features/kitchen/pages/KitchenBoard";

let root: Root | undefined;
let container: HTMLDivElement;
const mount = async () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<KitchenBoard onLogout={mocks.onLogout} />);
  });
};

beforeEach(() => {
  window.history.replaceState({}, "", "/");
  mocks.stations = undefined;
  mocks.tickets = undefined;
  mocks.isLoading = false;
  mocks.isFetching = false;
  mocks.connected = false;
  mocks.isPending = false;
  mocks.variables = undefined;
  mocks.getTerminalStationId.mockReturnValue(undefined);
  mocks.getVoidAlertsEnabled.mockReturnValue(true);
  for (const fn of [
    mocks.refetch,
    mocks.mutate,
    mocks.onLogout,
    mocks.setTerminalStationId,
    mocks.setVoidAlertsEnabled,
  ]) fn.mockClear();
  mocks.stationArgs.length = 0;
  mocks.realtimeArgs.length = 0;
  mocks.attentionArgs.length = 0;
  mocks.cardProps.length = 0;
});

afterEach(async () => {
  if (root) {
    await act(async () => root!.unmount());
    root = undefined;
  }
  container?.remove();
});

describe("KitchenBoard interaction coverage", () => {
  it("renders loading, polling and fetching states with undefined data", async () => {
    mocks.isLoading = true;
    mocks.isFetching = true;
    await mount();
    expect(container.textContent).toContain("0 active tickets");
    expect(container.textContent).toContain("Polling");
    expect(container.textContent).toContain("loading");
    expect(
      container.querySelector('button[aria-label="Refresh tickets"]')?.className,
    ).toContain("animate-spin");
    expect(mocks.setTerminalStationId).toHaveBeenCalledWith(undefined);
  });

  it("uses stored station, renders stations/tickets/live counters, overflow, and mutation state", async () => {
    mocks.getTerminalStationId.mockReturnValue("stored");
    mocks.stations = [
      { id: "stored", name: "Grill" },
      { id: "cold", name: "Cold" },
    ];
    const now = Date.now();
    const values = Array.from({ length: 201 }, (_, i) => ({
      ...ticket,
      id: `ticket-${i}`,
      status: i === 0 ? ("READY" as const) : ("FIRED" as const),
      firedAt: i === 1 ? new Date(now - 20 * 60_000).toISOString() : new Date(now).toISOString(),
    }));
    mocks.tickets = values;
    mocks.connected = true;
    mocks.isPending = true;
    mocks.variables = { id: "ticket-0", status: "READY" };
    await mount();

    expect(mocks.stationArgs.at(-1)).toBe("stored");
    expect(container.textContent).toContain("201 active tickets");
    expect(container.textContent).toContain("1 urgent");
    expect(container.textContent).toContain("1 ready");
    expect(container.textContent).toContain("High kitchen load: 201 active tickets");
    expect(container.textContent).toContain("Live");
    expect(container.querySelector('[data-ticket="ticket-0"]')?.getAttribute("data-updating")).toBe("true");
    expect(container.querySelector('[data-ticket="ticket-1"]')?.getAttribute("data-updating")).toBe("false");
  });

  it("handles station, void-alert, refresh, ticket update, and logout interactions", async () => {
    mocks.stations = [{ id: "grill", name: "Grill" }];
    mocks.tickets = [{ ...ticket, id: "interactive", status: "FIRED" }];
    await mount();

    const select = container.querySelector('select[aria-label="KDS station"]') as HTMLSelectElement;
    await act(async () => {
      select.value = "grill";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(mocks.setTerminalStationId).toHaveBeenCalledWith("grill");
    expect(mocks.stationArgs.at(-1)).toBe("grill");

    await act(async () => {
      select.value = "";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(mocks.setTerminalStationId).toHaveBeenCalledWith(undefined);

    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    await act(async () => {
      checkbox.click();
    });
    expect(mocks.setVoidAlertsEnabled).toHaveBeenCalledWith(false);

    await act(async () => {
      (container.querySelector('button[aria-label="Refresh tickets"]') as HTMLButtonElement).click();
      (container.querySelector('[data-ticket="interactive"]') as HTMLButtonElement).click();
      (container.querySelector('button[aria-label="Log out"]') as HTMLButtonElement).click();
    });
    expect(mocks.refetch).toHaveBeenCalled();
    expect(mocks.mutate).toHaveBeenCalledWith({ id: "interactive", status: "PREPARING" });
    expect(mocks.onLogout).toHaveBeenCalled();
  });

  it("prefers stationId from the URL and renders empty columns", async () => {
    window.history.replaceState({}, "", "/?stationId=query-station");
    mocks.tickets = [];
    mocks.stations = [];
    mocks.getVoidAlertsEnabled.mockReturnValue(false);
    await mount();
    expect(mocks.stationArgs.at(-1)).toBe("query-station");
    expect(container.textContent?.match(/No tickets/g)?.length).toBe(4);
    expect(container.textContent).toContain("0 urgent");
    expect(container.textContent).toContain("0 ready");
  });
});
