// Generated-contract placeholder kept in source control so consumers have a stable import.
// Run `bun run contracts:generate` while the API is running to refresh this list from /swagger/json.
export const OPENAPI_VERSION = "unresolved" as const;
export const OPENAPI_OPERATIONS = [] as const;
export type OpenApiOperation = (typeof OPENAPI_OPERATIONS)[number];
export type OpenApiMethod = OpenApiOperation extends { method: infer Method }
  ? Method
  : string;
export type OpenApiPath = OpenApiOperation extends { path: infer Path }
  ? Path
  : string;
