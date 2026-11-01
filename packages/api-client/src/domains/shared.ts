import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import type { PaginatedResponse, SuccessResponse } from "@pos/contracts";

export type DomainHttpClient = Pick<
  AxiosInstance,
  "get" | "post" | "put" | "patch" | "delete"
>;

export const voidDomainRequest = async (request: unknown): Promise<void> => {
  await request;
};

function unwrap<T>(response: AxiosResponse<SuccessResponse<T>>): T {
  return response.data.data;
}

export async function getDomainData<T>(
  client: DomainHttpClient,
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  return unwrap(
    config === undefined
      ? await client.get<SuccessResponse<T>>(url)
      : await client.get<SuccessResponse<T>>(url, config),
  );
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginatedResponse<T>["pagination"];
}

export async function getPaginatedDomainData<T>(
  client: DomainHttpClient,
  url: string,
  config?: AxiosRequestConfig,
): Promise<PaginatedResult<T>> {
  const response =
    config === undefined
      ? await client.get<PaginatedResponse<T>>(url)
      : await client.get<PaginatedResponse<T>>(url, config);
  return { items: response.data.data, pagination: response.data.pagination };
}

export async function postDomainData<T>(
  client: DomainHttpClient,
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  if (config !== undefined) {
    return unwrap(await client.post<SuccessResponse<T>>(url, body, config));
  }
  return unwrap(
    body === undefined
      ? await client.post<SuccessResponse<T>>(url)
      : await client.post<SuccessResponse<T>>(url, body),
  );
}

export async function putDomainData<T>(
  client: DomainHttpClient,
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  if (config !== undefined) {
    return unwrap(await client.put<SuccessResponse<T>>(url, body, config));
  }
  return unwrap(
    body === undefined
      ? await client.put<SuccessResponse<T>>(url)
      : await client.put<SuccessResponse<T>>(url, body),
  );
}

export async function patchDomainData<T>(
  client: DomainHttpClient,
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  if (config !== undefined) {
    return unwrap(await client.patch<SuccessResponse<T>>(url, body, config));
  }
  return unwrap(
    body === undefined
      ? await client.patch<SuccessResponse<T>>(url)
      : await client.patch<SuccessResponse<T>>(url, body),
  );
}

export async function deleteDomainData<T>(
  client: DomainHttpClient,
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  return unwrap(
    config === undefined
      ? await client.delete<SuccessResponse<T>>(url)
      : await client.delete<SuccessResponse<T>>(url, config),
  );
}
