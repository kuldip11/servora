# Servora API Contract — Module Migration Matrix

This file is the module-by-module implementation checklist for `API_CONTRACT_HARDENING_PLAN.md`.

## How to use this matrix

Each row represents a route file. Complete the columns in order:

1. **Request inventory** — enumerate params/query/body/headers/raw body.
2. **Request contract** — authoritative schemas live in `@pos/contracts`.
3. **Response inventory** — enumerate success/error status shapes.
4. **Response contract** — runtime schemas declared.
5. **Mapper** — explicit DTO mapper added where needed.
6. **Tests** — applicable contract matrix cases covered.
7. **OpenAPI** — operation fully represented.

Use `N/A` only with a short explanation in the module implementation note. A `COMPLETED` mapper review means either an explicit DTO mapper exists or the route was reviewed and the response is already a deliberate non-persistence DTO. Notes in the final column preserve the original audit concern for context; the status columns are authoritative for current completion.

| Route file                                                         | Request inventory | Request contract | Response contract | DTO mapper review | Contract tests | OpenAPI   | Notes                                                                               |
| ------------------------------------------------------------------ | ----------------- | ---------------- | ----------------- | ----------------- | -------------- | --------- | ----------------------------------------------------------------------------------- |
| `core/observability/frontend-telemetry.route.ts`                   | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | Validate telemetry envelope; keep cardinality-safe behavior                         |
| `core/observability/metrics.route.ts`                              | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | Token/header contract + text/metrics response must be explicit                      |
| `modules/analytics/analytics.route.ts`                             | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | Query/date/branch filters and analytics DTOs                                        |
| `modules/approvals/approval.route.ts`                              | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | End-to-end pilot complete; runtime DTO serialization pattern established            |
| `modules/audit/audit.route.ts`                                     | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | Pagination/filter/date/entity queries need common primitives                        |
| `modules/auth/auth.route.ts`                                       | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | High-risk response mapping: tokens/session/user data                                |
| `modules/billing/billing.route.ts`                                 | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | UUID/length drift already identified; payment DTO safety                            |
| `modules/billing/razorpay-webhook.route.ts`                        | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | AC-400; raw body + signature + runtime payload validation                           |
| `modules/branches/branch.route.ts`                                 | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | Shared UUID/request contracts + explicit branch mapper/response DTOs complete       |
| `modules/customer-groups/customer-group.route.ts`                  | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | Group filters/membership payloads                                                   |
| `modules/customer/customer-requests.route.ts`                      | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | Inline schemas; customer/waiter request state contracts                             |
| `modules/customer/customer.route.ts`                               | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | Session/public data; high privacy review                                            |
| `modules/inventory/inventory.route.ts`                             | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | Quantity/decimal/unit constraints; stock adjustment DTOs                            |
| `modules/kitchen-tickets/stations/station.route.ts`                | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | Inline/standalone station contract review                                           |
| `modules/kitchen-tickets/ticket.route.ts`                          | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | Status transitions, ticket/item DTOs                                                |
| `modules/loyalty/loyalty.route.ts`                                 | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | Points bounds, customer IDs, ledger response review                                 |
| `modules/menu/availability/availability.route.ts`                  | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | Availability DTO/explainability response contract                                   |
| `modules/menu/bulk-ops/bulk-ops.route.ts`                          | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | Collection sizes, IDs, per-item result DTO                                          |
| `modules/menu/categories/category.route.ts`                        | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | Name/position/status constraints                                                    |
| `modules/menu/change-log/menu-change-log.route.ts`                 | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | Inline query schemas; audit-like DTO review                                         |
| `modules/menu/combos/combo.route.ts`                               | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | Inline schemas; nested groups/items/max sizes                                       |
| `modules/menu/import-export/import-export.route.ts`                | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | File/raw input semantics and import result DTOs                                     |
| `modules/menu/items/item.route.ts`                                 | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | Largest menu contract surface; variants/modifiers/pricing                           |
| `modules/menu/memberships/membership.route.ts`                     | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | Menu/item membership IDs and ordering                                               |
| `modules/menu/menus/menu.route.ts`                                 | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | Status/publish/branch scope DTOs                                                    |
| `modules/menu/modifiers/modifier.route.ts`                         | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | Nested option/group validation                                                      |
| `modules/menu/pricing/price-rule.route.ts`                         | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | Numeric bounds/date windows/targeting rules                                         |
| `modules/menu/promotions/promotion.route.ts`                       | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | Date/rule/discount limits and preview responses                                     |
| `modules/menu/recipes/recipes.route.ts`                            | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | Ingredient quantity/unit/recipe DTOs                                                |
| `modules/menu/sub-recipes/sub-recipe.route.ts`                     | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | Nested ingredient constraints                                                       |
| `modules/menu/templates/templates.route.ts`                        | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | Template payload/version response contract                                          |
| `modules/orders/cancellation-reasons/cancellation-reason.route.ts` | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | Inline schemas; ordering/status constraints                                         |
| `modules/orders/order.route.ts`                                    | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | Request migration complete; response DTO/mappers remain due large aggregate surface |
| `modules/organizations/organization.route.ts`                      | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | High-risk public DTO mapping and tenancy metadata                                   |
| `modules/permissions/permission.route.ts`                          | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | Permission name/code response contracts                                             |
| `modules/roles/role.route.ts`                                      | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | Role/permission nested response schemas                                             |
| `modules/staff/staff.route.ts`                                     | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | High-risk PII/auth-related DTO mapping                                              |
| `modules/tables/table.route.ts`                                    | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | UUID boundary validation + table DTO mapper/response schemas complete               |
| `modules/tenants/tenant.route.ts`                                  | COMPLETED         | COMPLETED        | COMPLETED         | COMPLETED         | COMPLETED      | COMPLETED | High-risk tenancy DTO and isolation review                                          |

## Suggested migration batches

### Batch 1 — pilot/common patterns

- orders
- branches
- tables

Purpose: prove UUID/common query schemas, nested request DTOs, response mappers, pagination, standard errors, and state-transition responses.

### Batch 2 — identity/security-sensitive

- auth
- organizations
- tenants
- staff
- roles
- permissions

Purpose: harden sensitive response DTOs before broad migration.

### Batch 3 — menu core

- menus
- categories
- items
- modifiers
- memberships
- availability

### Batch 4 — menu advanced

- pricing
- promotions
- combos
- recipes
- sub-recipes
- templates
- bulk operations
- import/export
- change log

### Batch 5 — operations

- inventory
- kitchen tickets
- kitchen stations
- analytics
- audit
- approvals
- cancellation reasons

### Batch 6 — customer/commercial

- customer
- customer requests
- customer groups
- loyalty
- billing
- Razorpay webhook

### Batch 7 — platform boundaries

- frontend telemetry
- metrics
- realtime inbound/outbound contracts (tracked in plan even though realtime is outside this HTTP route table)

## Per-module completion note template

Copy this section into the PR/agent report for each row:

```text
Module:
Route file:

Request contracts:
- params:
- query:
- body:
- headers/raw body:

Request drift resolved:
- ...

Response statuses/contracts:
- 2xx:
- 4xx:
- 5xx/common:

Mapper changes:
- ...

Security/tenancy review:
- ...

Tests added/updated:
- ...

OpenAPI:
- operation IDs:
- request schema:
- response schema:

Verification:
- command -> PASS/FAIL

Matrix status updated: YES/NO
```
