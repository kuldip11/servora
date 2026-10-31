import { describe, expect, it } from "vitest";
import * as auth from "@/features/auth";
describe("auth barrel", () => {
  it("exports runtime API", () => {
    expect(auth.LoginPage.$$typeof).toBe(Symbol.for("react.lazy"));
    expect(auth.useLogin).toBeTypeOf("function");
    expect(auth.getToken).toBeTypeOf("function");
    expect(auth.getWaiterName).toBeTypeOf("function");
    expect(auth.logout).toBeTypeOf("function");
    expect(auth.logoutSession).toBeTypeOf("function");
    expect(auth.restoreSession).toBeTypeOf("function");
  });
});
