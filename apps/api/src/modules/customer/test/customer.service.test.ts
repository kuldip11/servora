import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSession: vi.fn(),
  getSession: vi.fn(),
  getMenu: vi.fn(),
  createOrder: vi.fn(),
  initiateTakeawayPayment: vi.fn(),
  verifyTakeawayPayment: vi.fn(),
  checkout: vi.fn(),
  getOrder: vi.fn(),
}));

vi.mock("@/modules/customer/customer-session.service", () => ({
  customerSessionService: {
    createSession: mocks.createSession,
    getSession: mocks.getSession,
  },
}));
vi.mock("@/modules/customer/customer-menu.service", () => ({
  customerMenuService: { getMenu: mocks.getMenu },
}));
vi.mock("@/modules/customer/customer-order.service", () => ({
  customerOrderService: { createOrder: mocks.createOrder },
}));
vi.mock("@/modules/customer/customer-payment.service", () => ({
  customerPaymentService: {
    initiateTakeawayPayment: mocks.initiateTakeawayPayment,
    verifyTakeawayPayment: mocks.verifyTakeawayPayment,
    checkout: mocks.checkout,
    getOrder: mocks.getOrder,
  },
}));

import { customerService } from "@/modules/customer/customer.service";

describe("customerService facade", () => {
  it("exposes the underlying customer service functions", () => {
    expect(customerService.createSession).toBe(mocks.createSession);
    expect(customerService.getSession).toBe(mocks.getSession);
    expect(customerService.getMenu).toBe(mocks.getMenu);
    expect(customerService.createOrder).toBe(mocks.createOrder);
    expect(customerService.initiateTakeawayPayment).toBe(
      mocks.initiateTakeawayPayment,
    );
    expect(customerService.verifyTakeawayPayment).toBe(
      mocks.verifyTakeawayPayment,
    );
    expect(customerService.checkout).toBe(mocks.checkout);
    expect(customerService.getOrder).toBe(mocks.getOrder);
  });
});
