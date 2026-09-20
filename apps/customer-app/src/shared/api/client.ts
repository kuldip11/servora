import {
  ApiClientErrorException,
  apiClientErrorFromResponse,
} from "@pos/api-client";

export const CUSTOMER_API_REQUEST_TIMEOUT_MS = 15_000;

export const resolveApiUrl = (
  configuredApiUrl: string | undefined,
  isDevelopment: boolean,
) => {
  const configured = configuredApiUrl?.trim();
  return isDevelopment ? "" : (configured ?? "").replace(/\/$/, "");
};

const API_URL = resolveApiUrl(
  import.meta.env.VITE_API_URL,
  import.meta.env.DEV,
);

export async function request<T>(
  path: string,
  init?: RequestInit,
  sessionToken?: string,
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort(init?.signal?.reason);

  if (init?.signal?.aborted) {
    abortFromCaller();
  } else {
    init?.signal?.addEventListener("abort", abortFromCaller, { once: true });
  }

  const timeoutId = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, CUSTOMER_API_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(sessionToken ? { "X-Customer-Session": sessionToken } : {}),
        ...(init?.headers ?? {}),
      },
    });

    const body = await response.json().catch(() => null);
    if (!response.ok || body?.success === false) {
      throw new ApiClientErrorException(
        apiClientErrorFromResponse(
          body,
          response.status,
          "Customer API request failed",
        ),
      );
    }
    return body.data as T;
  } catch (error) {
    if (error instanceof ApiClientErrorException) throw error;

    if (timedOut) {
      throw new ApiClientErrorException({
        code: "REQUEST_TIMEOUT",
        message: "The request timed out. Please try again.",
        retryable: true,
      });
    }

    if (init?.signal?.aborted) {
      throw new ApiClientErrorException({
        code: "REQUEST_ABORTED",
        message: "The request was cancelled.",
        retryable: false,
      });
    }

    throw new ApiClientErrorException({
      code: "NETWORK_ERROR",
      message:
        "Unable to reach Servora. Please check your connection and try again.",
      retryable: true,
    });
  } finally {
    globalThis.clearTimeout(timeoutId);
    init?.signal?.removeEventListener("abort", abortFromCaller);
  }
}
