import { expect, it, vi } from "vitest";
const request = vi.hoisted(() => vi.fn());
vi.mock("@/shared/api/client", () => ({ request }));
import { createCustomerSession } from "../api";
it("creates customer session", async () => {
  await createCustomerSession("qr");
  expect(request).toHaveBeenCalledWith("/api/customer/sessions", {
    method: "POST",
    body: JSON.stringify({ qrToken: "qr" }),
  });
});
