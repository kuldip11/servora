# Servora UI Error Handling and Form Validation Plan

## Purpose

This document defines the implementation standard and remediation plan for error handling, validation, recovery, and failure-state UX across every Servora frontend surface:

- `apps/web`
- `apps/waiter-app`
- `apps/kitchen-display`
- `apps/customer-app`
- `apps/website`
- shared UI/error helpers in `packages/ui`, `packages/api-client`, and related frontend packages

The backend and API-client layers already expose structured errors such as stable error codes, HTTP status, `fieldErrors`, retryability, and request IDs. The remaining work is to make every UI module consume that information consistently and safely.

The central rule is:

```text
ERROR != EMPTY DATA
ERROR != NOT FOUND
ERROR != ZERO
ERROR != SUCCESSFUL FALLBACK
```

After any load or user action fails, the user must be able to understand what failed, whether the action succeeded, why it failed when safely available, and what they can do next.

## Goals

1. Every query-driven screen distinguishes loading, error, successful-empty, successful-populated, and stale-data states.
2. Every user-triggered mutation has a visible failure path.
3. Every create/edit form has complete frontend validation before submission.
4. Submit/create/save buttons are disabled while the form is client-invalid, while required prerequisite data is unavailable, or while submission is in progress.
5. Edit-form Save buttons are disabled when nothing has changed unless the workflow explicitly requires resubmission.
6. Backend `fieldErrors` are shown directly below the exact corresponding fields.
7. Non-field business errors are shown in a prominent form/dialog error region instead of being forced onto unrelated fields.
8. Invalid forms never appear to submit successfully and failed submissions never silently close/reset the form.
9. Financial and operational screens fail safely instead of inventing fallback business data after request failures.
10. Retryable query failures expose useful retry controls while non-idempotent mutations remain conservative about automatic retry.
11. Cached data is preserved when safe during background refresh failures and is clearly marked stale.
12. Permission, authentication, conflict, rate-limit, not-found, and server errors receive semantically correct UI treatment.
13. All error states meet Servora accessibility standards.
14. Automated tests cover the complete validation/error-state contract.

## Non-goals

- No visual redesign unrelated to error/validation UX.
- No changes to restaurant business rules unless an existing UI incorrectly masks a backend rule.
- No weakening of backend validation, RBAC, tenant isolation, pricing, availability, or authorization.
- No generic automatic retries for payments, order creation, refunds, stock mutations, or other non-idempotent actions.
- No duplicate frontend error contract parallel to `ApiClientError`.

## Mandatory engineering rules

All implementation work under this plan must follow these rules:

- Use the existing normalized `ApiClientError` contract and shared helpers. Do not create per-feature error envelopes.
- Do not branch on human-readable backend messages when stable `code`, `status`, or `fieldErrors` are available.
- Do not turn request failure into `[]`, `{}`, `null`, `0`, a not-found state, onboarding state, or other valid business state.
- A mutation must either render/handle its error at the call site or own an explicit shared `onError` policy.
- A form submission failure must preserve user-entered values and keep the form/modal open.
- Only successful submission may reset/close a create/edit form unless the user explicitly cancels.
- Backend field validation is authoritative after submission; frontend validation is an early UX guard, not a replacement.
- Automatic retry must remain limited to safe/idempotent operations.
- Financial and order-critical reads must fail closed.
- No `catch(() => [])`, `catch(() => undefined)`, or equivalent suppression is allowed for business-critical data unless a comment documents why the fallback is semantically valid and tests prove it.
- Do not use ErrorBoundary as normal API/form flow control.
- Do not log sensitive form values in telemetry.
- Add focused tests with each changed module and update `docs/UI_ERROR_HANDLING_STATUS.md` before marking work complete.

## Clean-component architecture requirements

UI error handling must make components smaller and more declarative, not turn pages/forms into large error-processing files. The implementation boundary is:

```text
API/service
   ↓
feature/query/mutation/form hook
   ↓
shared/domain error helpers
   ↓
small declarative component
   ↓
shared UI error primitive
```

Mandatory rules:

- Keep one meaningful React component per file. Extract substantial child sections instead of growing page/dialog files indefinitely.
- React components must not parse raw Axios/fetch responses, inspect backend envelopes directly, or duplicate API-error normalization.
- Generic API normalization belongs in `packages/api-client`.
- Generic reusable error presentation belongs in `packages/ui` or existing shared UI locations.
- App-level/shared UI semantics belong in shared error helpers; feature-specific business decisions stay inside the owning feature.
- Complex query definitions belong in dedicated feature hooks such as `useKitchenTickets`, `useOrders`, or equivalent instead of being repeated inline in large page components.
- Complex mutations belong in feature mutation hooks when they own cache invalidation, common telemetry, common success behavior, or reusable business logic.
- Complex forms should use dedicated form hooks such as `useMenuItemForm` when submit-state, mapping, dependency state, and backend errors would otherwise make the component long.
- Frontend schemas belong in dedicated schema/validation files. Do not spread ad-hoc validation `if` statements across JSX/submit handlers when the schema can represent the rule.
- Form-to-request and response-to-view-model transformations belong in mapper/helper files, not inline JSX.
- API calls belong in service/API modules, not directly in presentational components unless an existing tiny feature convention explicitly supports it.
- Constants/data that are reused or materially affect behavior belong in the appropriate `constants`/data files; do not introduce new hardcoded operational limits/messages throughout JSX.
- Use existing alias imports and arrow-function conventions in touched code.
- No new `any`; do not weaken strict typing, validation, authorization, or existing safety boundaries.
- Do not create duplicate helpers if an existing shared helper can be extended safely.
- No unrelated refactors. Split only what is necessary to keep the touched component maintainable while preserving current UI/behavior except for intentional error/validation changes.

Recommended feature structure where complexity justifies it:

```text
feature/
├── components/
│   ├── FeatureFormModal.tsx
│   ├── FeatureFormFields.tsx
│   └── FeatureErrorSummary.tsx
├── hooks/
│   ├── useFeatureForm.ts
│   ├── useCreateFeature.ts
│   └── useUpdateFeature.ts
├── services/
│   └── feature.service.ts
├── helpers/
│   ├── feature-form.mapper.ts
│   └── feature-error.helper.ts
├── schemas/
│   └── feature-form.schema.ts
├── constants/
│   └── feature.constants.ts
├── types/
│   └── feature.types.ts
└── pages/
    └── FeaturePage.tsx
```

This structure is a guide, not a requirement to create empty folders. Add a file only when it owns a real responsibility.

### Responsibility split

```text
packages/api-client
→ normalize transport/API errors

shared app error helpers
→ classify error semantics for UI

packages/ui
→ render reusable error/loading/stale/not-found/permission primitives

feature hooks/helpers
→ apply domain-specific rules, field mappings, cache invalidation, and recovery

components/pages
→ compose declarative UI states and user interactions
```

A component should not need to know the backend error envelope shape. It should receive normalized errors or already-derived presentation state.

### Component cleanliness acceptance rules

A changed module is not complete if error handling leaves the main component responsible for most of the following at once:

- raw API calls
- query/mutation construction
- response/error normalization
- backend field-name mapping
- request-payload construction
- schema validation rules
- cache invalidation
- retry classification
- observability decisions
- substantial JSX rendering

If several of these responsibilities accumulate, extract the appropriate hook/helper/schema/service/component before marking the task complete.

---

# 1. Standard UI error classification

Every normalized failure must map to an intentional presentation policy.

| Failure                                     | Primary UI behavior                                         |
| ------------------------------------------- | ----------------------------------------------------------- |
| Client validation failure                   | exact field error, no request sent                          |
| Backend `VALIDATION_FAILED` + `fieldErrors` | exact field errors, focus first invalid field               |
| Backend business-rule error without field   | form/dialog/page inline error                               |
| `401`                                       | session/auth recovery flow                                  |
| `403`                                       | explicit permission-denied state/message                    |
| genuine `404`                               | actual not-found state                                      |
| `409`                                       | conflict-specific message; refresh if stale state is likely |
| `429`                                       | rate-limit/temporary message and retry when safe            |
| `5xx`                                       | retryable error state, request reference when present       |
| network failure                             | offline/transient error state and retry when safe           |
| timeout                                     | retryable timeout state                                     |
| background refetch failure with cached data | preserve data + stale-data warning                          |
| unexpected render/runtime failure           | `AppErrorBoundary` + telemetry                              |

The primary error surface must match scope:

```text
field problem       -> field error
form/dialog problem -> inline form/dialog error
page query problem  -> page/section error state
short-lived action  -> contextual toast when no better local surface exists
background stale    -> stale-data banner/indicator
fatal render error  -> AppErrorBoundary
```

Do not show the same failure simultaneously as an inline field error and a duplicate generic toast.

---

# 2. Frontend form validation and submit-state contract

## 2.1 Client-side validation is mandatory

Every create/edit form must validate all constraints that can be known locally before sending a request, using the existing frontend validation stack (for example Zod + React Hook Form where already used).

Typical client-known constraints include:

- required fields
- minimum/maximum length
- email/URL/phone format where applicable
- numeric range
- integer-only fields
- positive price/cost/quantity
- percentage bounds
- start/end date ordering
- required selections
- mutually exclusive choices
- dependent fields
- repeated password equality
- valid modifier/variant quantities
- local duplicate selections

Frontend validation must mirror user-facing constraints but must not replace backend transport/domain validation.

## 2.2 Validation timing

Use validation behavior that gives timely feedback without overwhelming users:

- validate required/format rules on change and/or blur according to the form's existing React Hook Form mode
- after the first submit attempt, invalid fields should update immediately as the user corrects them
- server field errors should clear for a field when that field is edited and then client validation should run again
- avoid delaying all validation until submit on long operational forms

## 2.3 Submit/Create/Save button rules

For standard create forms, the primary action must be disabled when any of the following is true:

```text
!isValid
|| isSubmitting
|| mutation.isPending
|| requiredDependencyFailed
|| requiredDependencyLoading
```

For edit forms, also disable when the form is unchanged:

```text
!isValid
|| !isDirty
|| isSubmitting
|| mutation.isPending
|| requiredDependencyFailed
|| requiredDependencyLoading
```

Exceptions must be documented in the component when a workflow intentionally allows submission while unchanged.

The button label should reflect progress:

```text
Create -> Creating...
Save -> Saving...
Submit -> Submitting...
Retry -> Retrying...
```

The disabled state is only a UX guard. The submit handler must still call validation (`handleSubmit` or equivalent) because disabled-button logic is not a security or correctness boundary.

## 2.4 Server validation after submit

A client-valid form can still fail server validation because the server knows information the browser does not know, such as:

- uniqueness
- tenant/branch relationships
- stale state
- current availability
- permission
- business invariants
- concurrent changes

Standard flow:

```text
client validation
      |
      v
client-valid?
  | no -> exact field errors, request blocked
  | yes
      v
submit request
      |
      v
backend fieldErrors?
  | yes -> map to exact fields + focus first field
  | no
      v
business/global error?
  | yes -> inline form/dialog error
  | no -> success behavior
```

## 2.5 Exact backend field-error mapping

Every form must consume `extractApiFieldErrors()` / `applyApiFieldErrors()` or the standardized successor.

Example backend response:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Please check the information you entered.",
    "fieldErrors": {
      "name": ["A menu item with this name already exists."],
      "price": ["Price must be greater than zero."]
    }
  }
}
```

Expected UI:

```text
Name
[ Roasted Iced Latte ]
A menu item with this name already exists.

Price
[ 0 ]
Price must be greater than zero.
```

The form must not reduce this to a generic toast.

## 2.6 Focus and scroll behavior

After failed submission:

1. Map server field errors.
2. Focus the first invalid field when practical.
3. Scroll it into view for long forms/modals.
4. Keep all entered values intact.
5. Keep the dialog/page open.

For errors that cannot map to a specific field, focus or announce the form-level error region instead.

## 2.7 Unknown backend field names

If the backend returns a field-error key that the current form cannot map:

- do not silently discard it
- show the message in the form-level error summary
- record a safe observability event for frontend/backend contract drift
- do not expose sensitive payload data

## 2.8 Client validation and backend errors must coexist

Priority:

```text
1. prevent obviously invalid request using client validation
2. apply backend field validation when request is rejected
3. show form-level business/global errors when not field-specific
4. use toast only when a local error surface is not appropriate
```

---

# 3. Shared UI error primitives

Standardize/reuse shared components/helpers instead of per-page ad hoc JSX.

Target reusable primitives:

- `QueryErrorState`
- `InlineError`
- `FormErrorSummary`
- `StaleDataBanner`
- `PermissionDeniedState`
- `NotFoundState`
- `RetryButton`
- shared form `applyApiFieldErrors` + first-error focus helper

A query error component should support:

- normalized message
- fallback title/message
- retry button
- retry/loading state
- optional request reference
- compact/section/full-page variants where needed

---

# 4. Query-state correctness

Every query-driven UI must model these states explicitly:

```text
loading
error with no usable data
success with empty data
success with populated data
cached/stale data with background refresh failure
```

`data ?? []` or `data = []` may be used only after error semantics are independently handled.

Examples that are forbidden:

```text
failed staff query -> 0 staff
failed low-stock query -> Low Stock: 0
failed kitchen query -> 0 tickets
failed organization query -> onboarding
failed order query -> Order not found
failed bill query -> no bills / fallback bill
```

---

# 5. Stale-data and background refresh policy

When valid cached data exists and a background refetch fails:

- keep the cached data visible when safe
- do not replace it with an empty/error screen
- show a visible stale-data/connection warning on operational screens
- expose manual retry
- show last-updated time where useful

Priority surfaces:

- Kitchen Display
- Waiter Home
- Orders
- Tables
- Inventory
- Operations Center
- Branch Health
- Customer active order tracking

Example:

```text
Connection interrupted — showing last known data.
[Retry]
```

---

# 6. Mutation error policy

Every `useMutation`, `mutate`, `mutateAsync`, direct service call, and async user action must have a user-visible failure path.

No mutation may have only `onSuccess` unless its error is intentionally rendered elsewhere.

Standard outcomes:

- form mutation with field errors -> exact fields
- form mutation with non-field error -> form/dialog error
- small contextual command -> contextual toast/error near action
- conflict caused by stale state -> explain and offer refresh
- permission failure -> explicit permission message
- non-idempotent command -> do not automatically retry generically

Audit known silent or inconsistent paths including:

- Merge Order
- Refire Item
- Seat Share
- Split Bill
- refill actions
- menu item/tag/template/holiday deletes
- kitchen station/routing changes
- channel overrides
- promotion CRUD
- loyalty CRUD
- schedules
- remaining direct async `onClick` handlers

---

# 7. P0 financial safety

## Print Bills

A failed split-bill query must never be interpreted as "there are no split bills".

Fallback whole-order bill generation is allowed only after a successful server response confirms there are no persisted bills.

On failure:

- block print action
- show explicit load error
- expose retry
- preserve already-known safe state

## Payments

Payment cannot proceed using an assumed no-bill state after bill retrieval fails.

Required billing state must load successfully before bill/order payment decisions are enabled.

Apply equivalent fail-closed behavior to:

- split bills
- payment
- settlement
- refund
- void
- payment status
- other financial reads that determine action semantics

---

# 8. Kitchen Display remediation

Kitchen ticket/station failures must never look like an empty kitchen.

No-data error:

```text
Unable to load kitchen tickets.
The kitchen queue may be incomplete.
[Retry]
```

Cached-data refresh error:

```text
Connection interrupted — showing last known kitchen data.
[Retry]
```

Kitchen mutations must surface structured backend errors rather than replacing all failures with generic messages.

---

# 9. Waiter remediation

Waiter Home must not show "All caught up" unless all data sources required for that conclusion loaded successfully.

Remove swallowed business-data failures such as `.catch(() => undefined)`.

Explicitly handle failures for:

- ready orders
- customer requests
- bill requests
- tables
- menus
- combos
- promotions
- customer groups
- customer search
- order details
- order-entry dependencies

A failed dependency must not silently remove capabilities/data from the order-entry UI.

---

# 10. Order-detail semantics

Differentiate:

```text
404 -> Order not found
403 -> You do not have access to this order
network/timeout/503 -> Unable to load order + Retry
500 -> server error + request reference
```

Never use `!data` alone as proof of 404.

Apply the same semantic distinction to other detail pages.

---

# 11. Business/onboarding correctness

Business/organization/franchise query failure must not create a fake first-time onboarding state.

Do not convert infrastructure errors into empty organizations/franchises.

Only show onboarding when the relevant requests successfully confirm that the required entities do not exist.

---

# 12. Inventory, staff, tables, and administrative modules

Explicitly separate query failure from empty/zero state for:

- inventory items
- low stock
- suppliers
- recipes/sub-recipes
- movements/purchases
- staff
- roles/permissions
- tables
- customer groups
- branch/tenant configuration
- menu-management lists
- settings data

A failed KPI/count query must render unavailable/error, not zero.

---

# 13. Customer app

Preserve the completed Customer network/session fixes.

Additionally:

- active/placed order refresh failure must be visible
- preserve last known order state when safe
- do not clear persisted order/session state for transient failures
- expose retry for active-order refresh
- distinguish bootstrap failure from active-order refresh failure

---

# 14. Website forms

Contact and Demo Request forms must have frontend field validation even though backend validation remains authoritative.

Requirements:

- field-level required/format validation
- exact inline field messages
- submit disabled while client-invalid/submitting
- server `fieldErrors` mapped inline when available
- form-level error for network, rate limit, delivery, and unexpected failures
- preserve entered values after failure
- accessible error semantics

---

# 15. Authentication, permission, conflict, and rate limiting

## Authentication

A real `401` should use the correct staff/customer session recovery flow rather than producing many unrelated query toasts.

## Permissions

Predictably unavailable actions should respect RBAC in the UI, while backend `403` remains authoritative and must display an explicit permission message.

## Conflicts

Use contextual `409` feedback, for example:

- duplicate staff email
- duplicate table number
- stale order update
- already-settled bill

When conflict implies stale local data, offer Refresh rather than only Retry.

## Rate limiting

`429` should explain that the operation is temporarily limited and expose retry only when appropriate.

---

# 16. Retry policy

`isRetryableApiError()` should drive both automatic query retry policy and visible manual recovery.

After automatic retries are exhausted:

- show Retry for retryable queries
- disable Retry while refetching
- show `Retrying...`

Do not add generic automatic mutation retries for payments, order creation, refund, stock mutation, or similar commands unless the operation has explicit idempotency semantics.

---

# 17. Request references

Continue displaying `requestId` for support-relevant failures such as unexpected `5xx`/internal errors.

Do not clutter ordinary validation errors with request references.

---

# 18. Accessibility requirements

All error handling must satisfy:

- field errors associated via `aria-invalid` and `aria-describedby`
- form-level error summary announced appropriately
- useful focus movement after failed submit
- keyboard-accessible retry/action buttons
- color is never the only error indicator
- loading/disabled state remains understandable to assistive technology
- avoid repeated live-region announcements for the same background failure

---

# 19. Observability

Continue frontend telemetry for unexpected failures and safe operational categories.

Useful metadata where safe:

- application
- route
- normalized error code
- HTTP status
- request ID
- query/mutation operation identifier
- component stack for React failures

Never send passwords, tokens, payment details, or raw sensitive form values.

Unknown backend field-error keys should be observable as contract drift.

---

# 20. Mechanical audit rules

The final audit must search all frontend applications for:

```text
useQuery
useInfiniteQuery
useMutation
mutate(
mutateAsync(
.catch(() => [])
.catch(() => undefined)
data = []
data ?? []
data ?? null
async onClick
direct service calls
fetch(
```

Every result must be reviewed and classified as safe or remediated.

Acceptance conditions:

- zero unreviewed business-data error suppression
- zero critical queries that turn failure into valid empty/zero data
- zero user-triggered mutations without visible error treatment
- every create/edit form has defined client validation + backend field-error behavior
- every submit button follows the agreed client-valid/submitting/dependency rules

---

# 21. Test strategy

## Form tests

For each important form, cover:

- required-field validation
- format/range validation
- submit disabled when client-invalid
- submit enabled when client-valid
- edit Save disabled when unchanged
- submission disabled while request is pending
- no request is sent for client-invalid form
- backend `fieldErrors` appear under exact fields
- first server-invalid field receives focus/scroll where practical
- unknown backend field error reaches form summary
- non-field backend error reaches form/dialog error
- values remain after failure
- modal/page remains open after failure
- no duplicate toast when inline field errors were handled
- successful submission resets/closes as designed

## Query tests

Cover:

- loading
- successful empty
- successful populated
- 403
- genuine 404
- 429
- 500/503
- network failure
- timeout
- Retry behavior
- background refetch failure with cached data
- stale-data indicator

## Mutation tests

Cover:

- visible structured error
- permission error
- business conflict
- no false-success state
- no unintended auto-retry for non-idempotent command
- disabled/pending action state

## P0 regression tests

Mandatory:

- failed bill loading cannot generate fallback whole-order bill
- failed bill loading blocks payment
- failed Kitchen ticket query cannot render empty/zero queue as healthy
- failed Waiter requests cannot render "All caught up"
- failed organization load cannot trigger onboarding
- failed order load cannot render "Order not found" unless status is actual 404
- failed low-stock query cannot render `0`

---

# 22. Implementation phases

## Phase A — Foundation and shared standards

- finalize shared error classification
- shared query/form/stale error primitives
- standardized server field-error mapping + first-error focus
- submit-state helper/pattern documentation

## Phase B — P0 financial and operational safety

- Print Bills
- Payment
- Kitchen ticket/station state
- Waiter Home aggregation

## Phase C — Query-state correctness

- Orders/detail pages
- Business/onboarding
- Inventory
- Staff
- Tables
- menu-management data
- Branch Health/operations
- remaining administrative queries

## Phase D — Mutation completeness

- audit every mutation/direct async action
- add missing structured failure UI
- remove swallowed business-operation failures

## Phase E — Form validation and backend field errors

- migrate every create/edit form to the full client + server validation contract
- enforce submit-button validity/pending/dirty/dependency behavior
- test field-level server errors

## Phase F — Customer and Website

- active-order refresh state
- website inline validation
- remaining customer-facing form/query states

## Phase G — Accessibility, stale-data, telemetry polish

- stale indicators
- focus/live-region behavior
- safe observability enrichment

## Phase H — Final audit and release verification

Run:

```bash
bun run typecheck
bun run test
bun run lint
bun run format:check
bun run build
```

Then repeat the mechanical audit and update the status tracker.

---

# 23. Definition of done

UI error handling is complete only when all of the following are true:

1. No request failure is presented as valid empty/zero/not-found/onboarding data.
2. Every query has an intentional error presentation and retry policy.
3. Every user-triggered mutation has a visible failure path.
4. Every create/edit form performs frontend validation before submission.
5. Standard submit buttons are disabled until client-valid and while pending; edit Save also respects dirty state.
6. Backend `fieldErrors` render below exact matching fields across all forms.
7. Non-field business errors render in a form/dialog/page error region.
8. Failed submissions preserve user-entered values and do not close/reset the form.
9. Financial/operational screens fail safely.
10. Cached data is preserved and marked stale when background refresh fails where appropriate.
11. Authentication, permission, conflict, rate-limit, not-found, network, timeout, and server failures have correct semantics.
12. Error and validation states are accessible.
13. Required regression tests pass.
14. Typecheck, tests, lint, format, and build pass.
15. `docs/UI_ERROR_HANDLING_STATUS.md` has no remaining `PENDING`, `IN_PROGRESS`, or `BLOCKED` items for the agreed scope.
