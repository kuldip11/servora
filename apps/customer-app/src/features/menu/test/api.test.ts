import { expect, it, vi } from "vitest";
const request = vi.hoisted(() => vi.fn());
vi.mock("@/shared/api/client", () => ({ request }));
import { getCustomerMenu } from "../api";
it("requests customer menu", () => {
  getCustomerMenu("s");
  expect(request).toHaveBeenCalledWith("/api/customer/menu", undefined, "s");

  const signal = new AbortController().signal;
  getCustomerMenu("s", signal);
  expect(request).toHaveBeenLastCalledWith(
    "/api/customer/menu",
    { signal },
    "s",
  );
});
