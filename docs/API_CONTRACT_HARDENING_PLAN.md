# Servora API Contract Hardening Plan

## Purpose

This document defines the implementation plan for making Servora's HTTP and realtime contract layer fully explicit, runtime-validated, drift-resistant, and production-ready.

The existing API error architecture is already standardized and must be preserved. This plan focuses on the remaining contract gaps: request-schema duplication, inconsistent identifier/query validation, missing response schemas, missing response DTO mappers, external payload validation, realtime message validation, incomplete OpenAPI generation, and frontend/API contract drift.

The current baseline contains **229 HTTP endpoints across 39 route files**. All work in this plan must preserve existing successful behavior unless a task explicitly documents a contract correction.

## Goals

1. Every HTTP endpoint declares an explicit runtime request contract for every applicable input surface: `params`, `query`, `headers`, `body`, cookies, or raw-body requirements.
2. Every HTTP endpoint declares explicit runtime response schemas for all public success and error statuses.
3. Public response DTOs are separate from database/repository entities.
4. Transport schemas have one source of truth.
5. Frontend form validation is allowed to differ from transport validation and must not be used as the authoritative API contract.
6. External payloads such as Razorpay webhooks are signature-verified and runtime-validated before business logic executes.
7. Realtime inbound and outbound messages are runtime-validated against explicit event contracts.
8. OpenAPI is generated from the real runtime contracts and becomes suitable for generating the typed API client.
9. CI fails if a new endpoint is introduced without declared contract coverage.
10. No technical/internal data is accidentally exposed by response serialization.

## Non-goals

- No UI redesign.
- No unrelated business-rule changes.
- No new product features.
- No migration to GraphQL.
- No replacement of Elysia unless independently required.
- No duplicated pricing, availability, authorization, tenancy, or business logic.
- No weakening of existing error, validation, authorization, or tenant-isolation behavior.

## Mandatory engineering rules for AI agents

Every agent implementing this plan must follow these rules:

- Work **one module or one clearly bounded shared-contract task at a time**.
- Preserve public behavior and response semantics unless the task explicitly calls out a correction.
- Do not use `any`.
- Avoid `as unknown as` at contract boundaries. If a cast is required temporarily, document why and remove it before the module is marked complete.
- Do not move business validation into route/controller schemas. Runtime transport validation and business/domain validation are separate concerns.
- Do not place database entities directly into public HTTP responses when a response DTO exists or is being introduced.
- Do not create a second authoritative schema for the same transport payload.
- Do not copy schemas between API and frontend packages.
- Do not parse frontend behavior from human-readable error messages; use stable error codes.
- Server-side pricing and availability remain authoritative.
- Every changed endpoint must retain or improve tenant isolation and RBAC coverage.
- Add only necessary tests for the changed contract/module, then run phase-level verification.
- Update `docs/API_CONTRACT_HARDENING_STATUS.md` after every completed task.
- Update `docs/API_CONTRACT_MODULE_MATRIX.md` whenever a module changes status.

---

# Target architecture

## Package layout

Create a dedicated transport-contract workspace:

```text
packages/contracts/
  package.json
  tsconfig.json
  src/
    index.ts
    common/
      ids.ts
      pagination.ts
      sorting.ts
      dates.ts
      errors.ts
      responses.ts
    analytics/
      requests.ts
      responses.ts
    approvals/
      requests.ts
      responses.ts
    audit/
      requests.ts
      responses.ts
    auth/
      requests.ts
      responses.ts
    billing/
      requests.ts
      responses.ts
      webhooks.ts
    branches/
      requests.ts
      responses.ts
    customer/
      requests.ts
      responses.ts
    customer-groups/
      requests.ts
      responses.ts
    inventory/
      requests.ts
      responses.ts
    kitchen/
      requests.ts
      responses.ts
    loyalty/
      requests.ts
      responses.ts
    menu/
      ...
    orders/
      requests.ts
      responses.ts
    organizations/
      requests.ts
      responses.ts
    permissions/
      requests.ts
      responses.ts
    roles/
      requests.ts
      responses.ts
    staff/
      requests.ts
      responses.ts
    tables/
      requests.ts
      responses.ts
    tenants/
      requests.ts
      responses.ts
    realtime/
      envelopes.ts
      inbound.ts
      outbound.ts
      events/
```

The exact sub-file split may evolve, but contracts must remain organized by domain and must not collapse into one large global file.

## API module layout after migration

```text
apps/api/src/modules/orders/
  order.route.ts
  order.controller.ts
  order.service.ts
  order.repository.ts
  order.errors.ts
  order.mapper.ts
  order.types.ts          # domain/internal types only, when needed
```

Transport request/response schemas move to `@pos/contracts`. Existing `*.validator.ts` files should be removed only after every schema they contain is migrated and all imports are updated.

## Responsibility boundaries

```text
HTTP request
   ↓
@pos/contracts request schema
   ↓
route/controller
   ↓
service
   ↓
business/domain validation
   ↓
repository
   ↓
service/domain aggregate
   ↓
response mapper
   ↓
@pos/contracts response schema
   ↓
HTTP response
```

### Contract schema responsibilities

Contract schemas validate transport shape only:

- required/optional fields
- primitive types
- UUIDs
- enums
- string lengths
- numeric bounds
- date/time representation
- pagination/sorting representation
- nested request/response structures

They must **not** perform database lookups, authorization, tenancy checks, pricing decisions, availability decisions, or business state transitions.

### Service responsibilities

Services continue to own:

- resource existence rules
- authorization-aware domain operations
- order state transitions
- availability decisions
- pricing rules
- stock sufficiency
- duplicate/business conflict detection
- tenant-aware domain semantics

### Mapper responsibilities

Mappers explicitly convert internal/domain/database values into public response DTOs.

Example:

```ts
export const toOrderResponse = (order: OrderAggregate): OrderResponse => ({
  id: order.id,
  status: order.status,
  subtotal: order.subtotal,
  tax: order.tax,
  total: order.total,
  items: order.items.map(toOrderItemResponse),
});
```

A mapper should make exposure deliberate. Adding a database column must not automatically add an API field.

---

# Phase 0 — Baseline and guardrails

## AC-000 — Freeze baseline inventory

**Status:** see status tracker.

### Tasks

- Record the current 39 route files and 229 endpoints.
- Keep the existing API error-contract inventory/sync test.
- Add a contract-hardening inventory test that records, for each endpoint:
  - HTTP method
  - path
  - route file
  - request surfaces used (`params`, `query`, `body`, etc.)
  - success statuses
  - declared response schema status
  - public/private auth category
- The inventory must fail when an endpoint is added without being represented.

### Acceptance criteria

- Inventory is generated from source, not manually duplicated.
- CI failure clearly identifies unaccounted endpoints.
- Existing error-contract suite remains green.

---

# Phase 1 — Create `@pos/contracts`

## AC-100 — Contracts workspace foundation

### Tasks

- Add `packages/contracts` to the monorepo.
- Use the runtime schema system compatible with Elysia/TypeBox already used by the API.
- Export both runtime schemas and inferred TypeScript types.
- Add package scripts for `typecheck`, `test`, and `build` if required by workspace conventions.
- Add root Turbo/workspace integration.
- Do not migrate domain schemas yet; establish infrastructure first.

### Acceptance criteria

- `@pos/contracts` imports successfully from API and frontend workspaces.
- Runtime schemas can be supplied directly to Elysia route definitions.
- Types are inferred from the same schema definition.
- No circular dependency from `@pos/contracts` to API, UI, database, or app packages.

## AC-110 — Common contract primitives

Create and test reusable schemas for:

- UUID/entity IDs
- optional UUID
- pagination page
- pagination limit
- pagination query
- sort direction
- search term
- ISO date/date-time strings as actually used by Servora
- branch/tenant/organization identifiers
- common success metadata if currently used
- standardized API error response
- field error response
- generic paginated response builder/helper if compatible with TypeBox typing

### Acceptance criteria

- Modules no longer define their own basic UUID/pagination primitives after migration.
- Limits match current production behavior; do not silently change max page sizes.
- Error schema exactly matches `docs/API_ERROR_CONTRACT.md`.

---

# Phase 2 — Request contract migration

## AC-200 — Migrate request schemas module-by-module

For every module listed in `docs/API_CONTRACT_MODULE_MATRIX.md`:

1. Inventory every route and request surface.
2. Compare existing API TypeBox/Elysia schema with any equivalent schema in `@pos/validation`.
3. Resolve existing drift deliberately. Do not automatically choose the stricter or looser version without checking current API behavior/tests.
4. Move authoritative transport schemas to `@pos/contracts/<domain>/requests.ts`.
5. Update route imports to use `@pos/contracts`.
6. Keep frontend form-specific validation in `@pos/validation` only where it represents form state rather than transport DTOs.
7. Remove the module `*.validator.ts` only when it is fully empty/redundant.
8. Add/adjust request contract tests.

### Required audit dimensions per module

- UUID vs arbitrary string IDs
- numeric minimum/maximum values
- integer vs decimal rules
- string min/max lengths
- enums
- optional vs nullable semantics
- empty string handling
- query coercion behavior
- date/time representation
- nested object constraints
- duplicate array entries where relevant
- maximum collection sizes where relevant
- unknown/extraneous properties behavior

### Acceptance criteria

- One authoritative transport schema exists for every request DTO.
- Route files import request schemas rather than redefining non-trivial schemas inline.
- Existing valid clients remain valid unless a documented bug is corrected.
- Invalid values fail at the HTTP boundary with the standard friendly error contract.

---

# Phase 3 — Response schemas and DTO mappers

## AC-300 — Common response schema architecture

### Tasks

- Add reusable response schema helpers to `@pos/contracts`.
- Define standardized error responses by status/category without duplicating the same object in every route.
- Establish route syntax/convention for declaring success and error response schemas.
- Document whether Elysia should serialize/strip unknown fields or reject mismatched responses; select one consistent policy.

**Selected policy:** Elysia response serialization strips undeclared properties when schemas use `additionalProperties: false`. Servora treats this as the production policy: accidental internal fields are removed at the HTTP boundary, while valid operations are not failed solely because an internal object carried extra properties. Structural/type mismatches remain contract violations.

### Acceptance criteria

- At least one pilot module demonstrates the final pattern.
- Runtime response validation works in tests.
- Technical/internal properties are not serialized.

## AC-310 — Domain response DTOs

For each module:

1. Inventory every success response shape.
2. Define public response schemas under `@pos/contracts/<domain>/responses.ts`.
3. Infer public response TypeScript types from schemas.
4. Identify responses currently returning repository/database records directly.
5. Add `*.mapper.ts` where explicit mapping is needed.
6. Update controller/service boundary to return public DTOs.
7. Add Elysia `response` declarations for each endpoint/status.
8. Add tests that intentionally inject an invalid internal object where practical and verify the boundary catches/strips it according to the selected policy.

### High-risk modules requiring explicit mapping review

- auth
- staff
- billing/payments
- organizations
- tenants
- customer
- audit
- orders

### Acceptance criteria

- Every endpoint has explicit success response schema coverage.
- Standard error responses are declared consistently.
- No sensitive/internal-only columns are included accidentally.
- Database schema changes do not automatically expand public response DTOs.

---

# Phase 4 — External payload hardening

## AC-400 — Razorpay webhook runtime validation

### Current gap

The current flow includes a type assertion after JSON parsing. A TypeScript assertion is not runtime validation.

### Required flow

```text
raw body
  ↓
signature verification
  ↓
JSON parsing
  ↓
runtime webhook envelope validation
  ↓
event-specific payload validation
  ↓
business handler
```

### Tasks

- Define Razorpay webhook envelope schema in `@pos/contracts/billing/webhooks.ts`.
- Define schemas for every event Servora actually consumes.
- Reject unsupported/malformed payloads safely.
- Preserve signature verification ordering so body transformations do not invalidate signatures.
- Ensure logs can capture safe diagnostic context without logging payment secrets or full sensitive payloads.

### Tests

- valid signature + valid known event
- valid signature + malformed JSON
- valid signature + structurally invalid payload
- valid signature + unsupported event
- invalid signature
- missing signature
- missing required nested identifiers
- wrong primitive types
- unexpected/extra fields according to selected policy
- handler/domain failure still returns safe response

---

# Phase 5 — Realtime contract hardening

## AC-500 — Inbound realtime message validation

### Tasks

- Define common `RealtimeEnvelope` runtime schema.
- Define schemas for each client-to-server message/event currently accepted.
- Replace `JSON.parse(...) as RealtimeEnvelope` style assertions with runtime decoding/validation.
- Reject malformed or unsupported realtime messages without crashing the socket server.
- Apply rate/security protections already present.

### Tests

- malformed JSON
- missing event name
- unsupported event
- missing payload
- malformed payload for known event
- unauthorized tenant/branch context
- valid event

## AC-510 — Outbound realtime event contracts

### Tasks

- Define runtime/type contracts for server-emitted events.
- Remove `as unknown as ...` payload casts around publication.
- Validate event payloads at publication in development/test and, if performance permits, production.
- Ensure `@pos/realtime` consumes the same public event types.

### Acceptance criteria

- API producer and frontend consumer use the same event type source.
- No duplicate event-payload interfaces across packages.

---

# Phase 6 — OpenAPI and generated client

## AC-600 — Complete OpenAPI specification

### Tasks

- Ensure every route contributes request and response schemas to OpenAPI.
- Ensure auth/security requirements are represented.
- Ensure standard error response schemas are represented.
- Ensure operation IDs are stable and deterministic.
- Check schema names for collisions and readability.
- Generate `docs/openapi.json` during verification or release workflow as appropriate.

### Acceptance criteria

- `OPENAPI_VERSION` and operation inventory are no longer unresolved/empty.
- OpenAPI endpoint count matches the route inventory.
- CI can compare generated OpenAPI with the committed/generated contract artifact.

## AC-610 — Generated API client

### Tasks

- Decide the generation tool only after OpenAPI quality is stable.
- Generate request/response types and client functions into `@pos/api-client` or a generated subfolder.
- Keep custom auth/retry/interceptor behavior in handwritten wrapper code.
- Migrate manual API calls incrementally.
- Do not manually edit generated files.

### Acceptance criteria

- Generated client is reproducible.
- CI fails if generated client is stale.
- Frontend apps no longer manually duplicate endpoint DTO types after migration.

---

# Phase 7 — Validation package cleanup

## AC-700 — Separate form validation from transport validation

### Tasks

Audit `@pos/validation` file by file.

Classify each schema as one of:

1. UI/form-state validation — keep in `@pos/validation`.
2. Network transport DTO duplication — remove and import/integrate `@pos/contracts` instead.
3. Shared business-like rule — move to the appropriate domain/service if it requires business context.

### Rules

- Form schemas may accept temporary UI states that transport schemas reject.
- Form schemas may provide richer display-specific messages.
- Form schemas must not silently become the backend contract source of truth.
- Do not force frontend forms to use TypeBox if Zod remains more ergonomic; keep boundaries explicit.

### Acceptance criteria

- No request DTO is independently defined in both packages.
- Existing form UX is preserved.

---

# Phase 8 — Contract completeness enforcement

## AC-800 — Every endpoint must declare request/response contracts

Add an automated contract-completeness test/script that fails for any endpoint missing applicable declarations.

The audit should verify, where applicable:

- path params schema
- query schema
- body schema
- headers schema
- success response schema
- standard error response schema
- auth/security metadata
- operation ID/OpenAPI discoverability

### Acceptance criteria

A newly added endpoint with an undeclared response schema must fail CI automatically.

## AC-810 — No unsafe transport casts

Add a static audit for boundary patterns such as:

```text
JSON.parse(...) as SomeExternalPayload
as unknown as ApiResponse
as unknown as RealtimeEnvelope
```

Do not ban all casts globally. Restrict the audit to HTTP, webhook, API-client, and realtime boundary files.

---

# Phase 9 — Test and release hardening

## AC-900 — Contract test matrix

For every endpoint, test applicable cases:

- valid request/success response
- malformed JSON for body routes
- invalid params
- invalid query
- invalid body fields
- missing required fields
- unauthenticated
- invalid/expired authentication
- unauthorized role
- cross-tenant access
- not found
- conflict/duplicate
- invalid state transition/domain rule
- dependency failure where the endpoint depends on an external system
- repository/database failure where meaningful
- unexpected exception sanitization
- response schema compliance
- technical data non-leakage

Not every endpoint requires every case. The matrix must explicitly mark non-applicable cases rather than silently omitting them.

## AC-910 — Verification commands

At module completion:

```bash
bun run --filter @pos/contracts typecheck
bun run --filter @pos/contracts test
bun run --filter @pos/api typecheck
bun run --filter @pos/api test
```

At phase completion:

```bash
bun run typecheck
bun run lint
bun run test
bun run build
bun run test:coverage
bun run contracts:generate
bun run contracts:verify
```

Also run security/RBAC verification when relevant:

```bash
bun run audit:rbac
```

---

# Recommended implementation order

Use this sequence to minimize rework:

1. **AC-000** inventory/guardrails
2. **AC-100 / AC-110** contracts package + common primitives
3. Pilot one medium-complexity module through requests + responses + mapper
4. **AC-200** migrate all request contracts
5. **AC-300 / AC-310** response schemas and mappers
6. **AC-400** Razorpay webhook validation
7. **AC-500 / AC-510** realtime contracts
8. **AC-600 / AC-610** OpenAPI and generated client
9. **AC-700** remove duplicated network schemas from `@pos/validation`
10. **AC-800 / AC-810** permanent CI completeness/static guards
11. **AC-900 / AC-910** endpoint matrix and final release verification

Do not generate a client before response schemas are complete. Otherwise the generated client merely codifies incomplete contracts and must be regenerated repeatedly.

---

# Definition of done

The initiative is complete only when all of the following are true:

- 229/229 current endpoints are accounted for, plus any endpoints added during implementation.
- Every endpoint has explicit runtime request validation for applicable input surfaces.
- Every endpoint has explicit runtime response schemas for public success/error statuses.
- No public endpoint depends on raw database-row serialization by accident.
- No duplicated transport DTO schema remains between API validators and frontend validation packages.
- Razorpay webhook payloads are runtime validated after signature verification.
- Realtime inbound/outbound messages use shared runtime contracts.
- OpenAPI accurately represents the full API.
- Generated API client is reproducible and drift-checked.
- New endpoints cannot bypass contract completeness in CI.
- Full typecheck, lint, tests, build, coverage, contract verification, and relevant RBAC/security checks pass.
