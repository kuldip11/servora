import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { KitchenTicketStatus } from "@pos/types";
import { ticket } from "@/features/kitchen/test/fixtures";

const mocks = vi.hoisted(() => ({ footerProps: undefined as any }));
vi.mock("@pos/ui", () => ({ Card: ({ children, className }: any) => <div className={className}>{children}</div> }));
vi.mock("@/features/kitchen/components/TicketHeader", () => ({ TicketHeader: () => <div>header</div> }));
vi.mock("@/features/kitchen/components/TicketItems", () => ({ TicketItems: () => <div>items</div> }));
vi.mock("@/features/kitchen/components/TicketFooter", () => ({
  TicketFooter: (props: any) => {
    mocks.footerProps = props;
    return <div>footer</div>;
  },
}));

import { TicketCard } from "@/features/kitchen/components/TicketCard";

describe("TicketCard coverage", () => {
  it("returns null for an unsupported status", () => {
    expect(
      renderToStaticMarkup(
        <TicketCard
          ticket={{ ...ticket, status: "SERVED" as never }}
          isUpdating={false}
          onUpdateStatus={vi.fn()}
        />,
      ),
    ).toBe("");
  });

  it("renders urgent danger and advances a ticket", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    const onUpdateStatus = vi.fn();
    const value = {
      ...ticket,
      status: "PREPARING" as const,
      firedAt: new Date(now - 20 * 60_000).toISOString(),
      items: [{ ...ticket.items[0]!, itemStatus: "VOIDED" as const }],
    };
    const html = renderToStaticMarkup(
      <TicketCard ticket={value} isUpdating onUpdateStatus={onUpdateStatus} />,
    );
    expect(html).toContain("ring-2");
    expect(html).toContain("URGENT VOID — stop preparation");
    mocks.footerProps.onAdvance();
    expect(onUpdateStatus).toHaveBeenCalledWith("t1", "READY" satisfies KitchenTicketStatus);
    vi.restoreAllMocks();
  });

  it("renders warning void before preparation", () => {
    const html = renderToStaticMarkup(
      <TicketCard
        ticket={{
          ...ticket,
          status: "FIRED",
          items: [{ ...ticket.items[0]!, itemStatus: "VOIDED" as const }],
        }}
        isUpdating={false}
        onUpdateStatus={vi.fn()}
      />,
    );
    expect(html).toContain("VOIDED before prep");
  });

  it("does not advance when there is no next status", () => {
    const onUpdateStatus = vi.fn();
    renderToStaticMarkup(
      <TicketCard
        ticket={{ ...ticket, status: "READY" }}
        isUpdating={false}
        onUpdateStatus={onUpdateStatus}
      />,
    );
    mocks.footerProps.onAdvance();
    expect(onUpdateStatus).not.toHaveBeenCalled();
  });
});
