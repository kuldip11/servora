import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TicketFooter } from "../TicketFooter";

describe("TicketFooter", () => {
  it("renders the next workflow action", () => {
    expect(
      renderToStaticMarkup(
        <TicketFooter
          next="PREPARING"
          nextLabel="Start Cooking"
          btnClass=""
          isUpdating={false}
          onAdvance={() => {}}
        />,
      ),
    ).toContain("Start Cooking");
  });

  it("renders waiter handoff when there is no next kitchen status", () => {
    expect(
      renderToStaticMarkup(
        <TicketFooter
          next={null}
          nextLabel={null}
          btnClass=""
          isUpdating={false}
          onAdvance={() => {}}
        />,
      ),
    ).toContain("Waiting for waiter");
  });
});
