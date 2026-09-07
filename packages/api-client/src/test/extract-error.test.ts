import axios, { AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { extractApiError } from "../extract-error";

describe("extractApiError", () => {
  it("returns the API message from an Axios error", () => {
    const error = new axios.AxiosError(
      "network message",
      "ERR_BAD_REQUEST",
      undefined,
      undefined,
      {
        status: 400,
        statusText: "Bad Request",
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: { message: "Invalid invoice" },
      },
    );
    expect(extractApiError(error)).toBe("Invalid invoice");
  });

  it("falls back to the Axios error message when the response has no message", () => {
    const error = new axios.AxiosError("Request timed out");
    expect(extractApiError(error)).toBe("Request timed out");
  });

  it("uses the stable Axios fallback when no response or message is available", () => {
    expect(extractApiError({ isAxiosError: true, message: undefined })).toBe(
      "Request failed",
    );
  });

  it("returns a regular Error message", () => {
    expect(extractApiError(new Error("Something failed"))).toBe(
      "Something failed",
    );
  });

  it("returns a stable fallback for unknown values", () => {
    expect(extractApiError({ reason: "unknown" })).toBe(
      "An unexpected error occurred",
    );
  });
});
