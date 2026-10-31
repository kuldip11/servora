import { describe, expect, it } from "vitest";

const jwt = await import("../jwt");

describe("jwt helpers", () => {
  const user = {
    id: "u1",
    email: "u@example.com",
    roles: [
      {
        name: "OWNER",
        permissions: [{ key: "tenant:read" }, { key: "tenant:read" }],
      },
    ],
  } as any;
  it("signs and verifies access tokens with identity and deduplicated permissions", () => {
    const token = jwt.signAccessToken(user);
    const payload = jwt.verifyAccessToken(token);
    expect(payload).toMatchObject({
      sub: "u1",
      app: "web",
      email: "u@example.com",
      roles: ["OWNER"],
      permissions: ["tenant:read"],
    });
    expect(
      (payload as unknown as Record<string, unknown>).tenantId,
    ).toBeUndefined();
  });

  it("rejects malformed access tokens", () => {
    expect(() => jwt.verifyAccessToken("bad")).toThrow();
  });
});
