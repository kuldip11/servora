import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  ApiResponse,
  AvailableMembership,
  Branch,
  KitchenTicketStatus,
  MenuItem,
  Order,
  OrderStatus,
  PaymentMethod,
  RestaurantTable,
  RoleName,
  TableStatus,
} from "../index";

describe("shared type contracts", () => {
  it("keeps core status unions constrained", () => {
    expectTypeOf<"OPEN">().toMatchTypeOf<OrderStatus>();
    expectTypeOf<"READY">().toMatchTypeOf<KitchenTicketStatus>();
    expectTypeOf<"UPI">().toMatchTypeOf<PaymentMethod>();
    expectTypeOf<"OCCUPIED">().toMatchTypeOf<TableStatus>();
    expectTypeOf<"MANAGER">().toMatchTypeOf<RoleName>();
    expect(true).toBe(true);
  });

  it("keeps cross-application DTO relationships available from the package barrel", () => {
    expectTypeOf<ApiResponse<Order>>().toHaveProperty("data");
    expectTypeOf<Order>().toHaveProperty("items");
    expectTypeOf<MenuItem>().toHaveProperty("basePrice");
    expectTypeOf<Branch>().toHaveProperty("name");
    expectTypeOf<RestaurantTable>().toHaveProperty("status");
    expectTypeOf<AvailableMembership>().toHaveProperty("membershipId");
    expect(true).toBe(true);
  });
});
