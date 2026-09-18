import { describe, expect, it } from "vitest";
import axios from "axios";
import { apiClientErrorFromResponse, toApiClientError } from "../api-error";

const axiosError = (data: unknown, status = 400) => {
  const error = new axios.AxiosError("Request failed");
  error.response = {
    data,
    status,
    statusText: "",
    headers: {},
    config: {} as never,
  };
  return error;
};

describe("toApiClientError", () => {
  it("normalizes the unified API error envelope", () => {
    expect(
      toApiClientError(
        axiosError(
          {
            success: false,
            error: {
              code: "ORDER_NOT_FOUND",
              message: "Order was not found.",
              retryable: false,
              requestId: "req-1",
              fieldErrors: { tableId: ["Please select a table."] },
            },
          },
          404,
        ),
      ),
    ).toEqual({
      code: "ORDER_NOT_FOUND",
      message: "Order was not found.",
      retryable: false,
      requestId: "req-1",
      fieldErrors: { tableId: ["Please select a table."] },
      status: 404,
    });
  });

  it("keeps compatibility with legacy flat API errors", () => {
    expect(
      toApiClientError(
        axiosError({ code: "CONFLICT", message: "Already exists" }, 409),
      ),
    ).toMatchObject({
      code: "CONFLICT",
      message: "Already exists",
      retryable: false,
      status: 409,
    });
  });

  it("marks server and rate-limit failures retryable", () => {
    expect(toApiClientError(axiosError({}, 503)).retryable).toBe(true);
    expect(toApiClientError(axiosError({}, 429)).retryable).toBe(true);
  });
  it("normalizes fetch response envelopes without losing correlation metadata", () => {
    expect(
      apiClientErrorFromResponse(
        {
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Please try again.",
            retryable: true,
            requestId: "req-fetch",
            fieldErrors: { name: ["Required"] },
          },
        },
        500,
      ),
    ).toEqual({
      code: "INTERNAL_ERROR",
      message: "Please try again.",
      retryable: true,
      requestId: "req-fetch",
      fieldErrors: { name: ["Required"] },
      status: 500,
    });
  });

});
