import { describe, expect, it } from "vitest";
import { mapDatabaseError } from "../database-error-mapper";
import { serializeAppError } from "../error-response";

describe("database error mapper", () => {
  it.each([
    ["23505", 409, "RESOURCE_ALREADY_EXISTS"],
    ["23503", 409, "RESOURCE_IN_USE"],
    ["40001", 503, "SERVICE_UNAVAILABLE"],
    ["40P01", 503, "SERVICE_UNAVAILABLE"],
  ])("sanitizes postgres %s", (code, status, publicCode) => {
    const mapped = mapDatabaseError({ code, detail: "secret database detail" });
    expect(mapped?.statusCode).toBe(status);
    const response = serializeAppError(mapped!, "req-db");
    expect(response.error.code).toBe(publicCode);
    expect(JSON.stringify(response)).not.toContain("secret database detail");
  });

  it("leaves unknown database errors for the generic 500 mapper", () => {
    expect(mapDatabaseError({ code: "99999" })).toBeUndefined();
  });
});
