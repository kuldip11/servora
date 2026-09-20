# API Error Contract

## Purpose

Servora API failures use one frontend-safe response contract. Route handlers and controllers must not expose database errors, stack traces, framework parser messages, dependency connection details, or other implementation-specific information.

```json
{
  "success": false,
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "Order was not found.",
    "retryable": false,
    "requestId": "request-id",
    "fieldErrors": {
      "name": ["Name is required."]
    }
  }
}
```

`fieldErrors` is optional and is included only when the frontend can associate an error with one or more fields.

## Ownership

- Services/domain logic decide **why** an operation failed and throw typed `AppError`/domain errors.
- `core/errors` decides **how** failures are represented over HTTP.
- Controllers/routes do not handcraft frontend failure payloads.
- `@pos/api-client` normalizes the wire error into `ApiClientError` for all frontend apps.
- Server logs retain diagnostic context; client responses do not.

## Global mappings

| Failure                           | HTTP | Public code                       | Retryable |
| --------------------------------- | ---: | --------------------------------- | --------- |
| Malformed JSON/body               |  400 | `MALFORMED_REQUEST`               | No        |
| Framework/schema validation       |  400 | `VALIDATION_FAILED`               | No        |
| Missing/invalid access token      |  401 | `UNAUTHORIZED`                    | No        |
| Missing customer session          |  401 | `CUSTOMER_SESSION_REQUIRED`       | No        |
| Insufficient permission/context   |  403 | `FORBIDDEN` or domain code        | No        |
| Missing route/resource            |  404 | `ROUTE_NOT_FOUND` / resource code | No        |
| Conflict/duplicate/state conflict |  409 | domain code                       | No        |
| Rate limit                        |  429 | stable rate-limit code            | Yes       |
| Service/dependency unavailable    |  503 | stable service code               | Yes       |
| Unexpected exception              |  500 | `INTERNAL_ERROR`                  | Yes       |

## Exhaustive endpoint guard

`src/test/helpers/api-endpoint-manifest.ts` scans the API route sources at test time. The contract suite fails if the endpoint inventory changes unexpectedly.

Current inventory: **229 HTTP endpoints**.

`src/core/errors/test/endpoint-error-matrix.test.ts` currently verifies:

- every HTTP endpoint has a unique manifest entry;
- every bearer-protected endpoint returns the standard error envelope with no credentials;
- every bearer-protected endpoint returns the same safe envelope for malformed bearer credentials;
- every body-accepting endpoint is exercised with malformed JSON and must return a frontend-safe error envelope;
- malformed JSON is classified as `400 MALFORMED_REQUEST` where request parsing applies;
- metrics access is hidden behind its token without revealing endpoint internals;
- frontend telemetry validation uses the standard validation envelope;
- customer routes expose a friendly customer-session error;
- public signup/login validation uses the standard validation envelope;
- refresh-token failures do not expose token/cookie/JWT internals.

Module/service tests continue to cover domain-specific cases such as not-found, conflicts, invalid state transitions, pricing/availability rules, permissions, tenant isolation, payment failures, inventory rules, and approval flows.

## Test invariants

Every frontend error response must have:

- `success: false`;
- non-empty stable `error.code`;
- frontend-readable `error.message`;
- boolean `error.retryable`;
- non-empty `error.requestId`;
- optional normalized `fieldErrors`;
- no stack trace, SQL state, database driver text, node path, source-file line, raw dependency failure, or parser internals.

## Adding or changing an endpoint

When adding a route:

1. Use typed domain/service errors instead of raw `Error` for expected failures.
2. Do not construct `{ success: false }` in the route/controller.
3. Add validator messages that are meaningful to users where field-specific wording matters.
4. Add/update domain tests for new business failure branches.
5. Run the API suite. The endpoint manifest test will automatically include the new route and force contract coverage.
6. If the endpoint has a special authentication mode, update `authModeFor` in the endpoint manifest helper.
