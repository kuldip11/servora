import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OrderBanners } from "@/features/orders/components/OrderBanners";
import { order, readyTicket } from "./fixtures";

describe("OrderBanners", () => {
  it("renders bill requests and ready-round counts", () => {
    expect(
      renderToStaticMarkup(
        <OrderBanners
          order={{ ...order, status: "BILL_REQUESTED" }}
          readyTickets={[readyTicket]}
        />,
      ),
    ).toContain("Bill requested");
    expect(
      renderToStaticMarkup(
        <OrderBanners
          order={order}
          readyTickets={[readyTicket, readyTicket]}
        />,
      ),
    ).toContain("2 rounds are ready");
  });
});
