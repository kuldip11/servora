# Servora UI Error Handling and Form Validation — Status Tracker

## Status values

- `PENDING` — not started
- `IN_PROGRESS` — currently being implemented
- `COMPLETED` — implemented and verified against acceptance criteria
- `BLOCKED` — cannot proceed because of a concrete dependency/decision

## Baseline — 2026-09-18

### Existing capabilities to preserve

| Capability                                      | Status             | Notes                                               |
| ----------------------------------------------- | ------------------ | --------------------------------------------------- |
| Normalized `ApiClientError`                     | COMPLETED          | Shared client error model exists                    |
| Backend `fieldErrors` transport                 | COMPLETED          | Preserved through API client                        |
| `extractApiError`                               | COMPLETED          | Includes serious request references                 |
| `extractApiFieldErrors` / field mapping helper  | COMPLETED baseline | Adoption is incomplete                              |
| `isRetryableApiError`                           | COMPLETED          | Query retry policy uses it in major apps            |
| Shared accessible input error support           | COMPLETED          | `aria-invalid` / `aria-describedby` baseline exists |
| React AppErrorBoundary                          | COMPLETED          | Wired to telemetry                                  |
| Customer network/timeout normalization          | COMPLETED          | Network/timeout/cancellation semantics normalized   |
| Customer transient-session persistence behavior | COMPLETED          | Transient failures do not clear persisted state     |
| Menu Item backend field-error rendering         | COMPLETED baseline | Existing reference implementation                   |
| Tables backend field-error rendering            | COMPLETED baseline | Existing reference implementation                   |

### Audit baseline

The independent UI audit found the following systemic gaps:

- query failures can still appear as empty/zero/healthy business states
- several operational mutations have no visible failure path
- backend field errors are not yet mapped inline for every create/edit form
- financial bill/payment reads can currently be treated too optimistically on failure
- some Waiter/Kitchen errors are generic or suppressed
- active Customer order refresh errors are not fully surfaced
- Website forms need complete client + inline server validation
- stale cached operational data needs clearer refresh-failure indication
- error remediation must preserve clean component architecture and avoid moving transport/error logic into JSX

## Current implementation checkpoint — 2026-09-19

Implemented and verified in the current checkpoint unless noted otherwise:

- P0 billing/payment fail-closed behavior
- Kitchen ticket/station error vs empty-state handling and stale-data presentation
- Waiter Home dependency-error handling; no false `All caught up`
- Web/Waiter Order Detail 404/403/transient-error semantics
- Business/onboarding false-empty protection
- Inventory, Staff, Tables, Branch Health, and Customer active-order false-empty/stale-state fixes
- shared `QueryErrorState`, `StaleDataBanner`, `FormErrorSummary`, `FieldErrorText`, and `useFormApiErrors` infrastructure
- backend field mapping with first-error focus, unknown-field fallback, and backend-to-form alias mapping
- completed form conversion + focused tests for Business Organization/Franchise/Branch, Staff, Inventory Item, Tags, Holidays, Templates, Modifier Groups, Customer Groups, Kitchen Stations, Menus, and Menu Availability
- Profile/Password, Signup, and Website Contact/Demo validation/error handling are implemented and verified by focused and full app test suites.
- Waiter Merge/Refire/Seat Share/Split Bill visible structured error handling is implemented and verified by the Waiter suite.
- structured mutation error handling is implemented for menu-item/tag/holiday/template deletes, kitchen station/routing, channel overrides, promotions, loyalty, schedules, organization menu operations, organization price-rule delete, and variant availability; larger form-level remediation remains for some of these domains

Source implementation is now complete for the known audit matrix: Combos, Pricing Rules/Branch Overrides, Promotions/Loyalty, Recipe/Sub-recipe, Settings/roles/categories, Waiter menu dependencies, Tables form completion, shared semantic error classification, request-reference policy, telemetry contract-drift reporting, and the final mechanical catch/default/mutation audit. Additional audit findings (Waiter cancellation reasons, transfer-table destinations, menu-engineering query state, bulk mutation error preservation, and menu-import failed-validation preservation) were also remediated.

Runtime verification has now been completed with the supplied dependency archive and reconstructed workspace links. All source-level UI error-handling tasks in the agreed scope are implemented and verified with app/package tests, TypeScript, ESLint, Prettier, frontend production builds, focused accessibility integration tests, and the final mechanical audit. Two environment-only release checks remain outside this container: the exact Bun 1.3.14 API bundle command (the Bun runtime itself is unavailable here) and browser navigation for the Playwright accessibility suite (Chromium is blocked from localhost by administrator policy). See `docs/UI_ERROR_HANDLING_AUDIT.md` for exact evidence.

## Master tracker

| ID      | Task                                                                                        | Priority | Status    | Verification                                                                                 |
| ------- | ------------------------------------------------------------------------------------------- | -------: | --------- | -------------------------------------------------------------------------------------------- |
| UIE-000 | Freeze UI query/mutation/form inventory and audit matrix                                    |       P0 | COMPLETED | mechanical inventory and final re-audit recorded                                             |
| UIE-100 | Standardize shared UI error classification/presentation policy                              |       P0 | COMPLETED | shared classifier tests green in API Client/Web integration                                  |
| UIE-110 | Add/reuse shared `QueryErrorState`, `FormErrorSummary`, `StaleDataBanner`, retry primitives |       P1 | COMPLETED | shared primitives and focused tests green                                                    |
| UIE-120 | Standardize server-field mapping, unknown-field fallback, first-error focus                 |       P0 | COMPLETED | field mapping, fallback, and focus behavior verified                                         |
| UIE-130 | Enforce clean-component architecture for all UI error remediation                           |       P0 | COMPLETED | architecture review complete; typecheck/lint/tests green                                     |
| UIE-200 | Enforce frontend validation contract across create/edit forms                               |       P0 | COMPLETED | known form matrix implemented and regression-tested                                          |
| UIE-210 | Enforce submit-button validity/pending/dependency rules                                     |       P0 | COMPLETED | valid/pending/dependency/dirty submit rules verified                                         |
| UIE-220 | Map backend `fieldErrors` inline across every editable form                                 |       P0 | COMPLETED | inline backend field errors verified across remediated forms                                 |
| UIE-230 | Preserve form values/modal state and prevent duplicate error surfaces                       |       P1 | COMPLETED | failed-submit preservation and inline summaries verified                                     |
| UIE-300 | Separate loading/error/empty/populated/stale query states everywhere                        |       P0 | COMPLETED | query-state regressions and final mechanical scan green                                      |
| UIE-310 | Add stale-data/background-refresh UX to operational screens                                 |       P1 | COMPLETED | cached-data stale states and retry behavior verified                                         |
| UIE-400 | Add visible structured error handling to every mutation/direct async action                 |       P0 | COMPLETED | mutation inventory reviewed; structured failure paths verified                               |
| UIE-500 | Fix Print Bills fail-closed behavior                                                        |       P0 | COMPLETED | failed bills query cannot print fallback bill                                                |
| UIE-510 | Fix Payment fail-closed behavior                                                            |       P0 | COMPLETED | failed bills query blocks payment                                                            |
| UIE-520 | Fix Kitchen query/empty/stale/error semantics                                               |       P0 | COMPLETED | failed tickets/stations cannot render healthy empty state                                    |
| UIE-530 | Fix Waiter Home aggregation and swallowed request failures                                  |       P0 | COMPLETED | failed dependencies cannot render `All caught up`                                            |
| UIE-540 | Fix Web/Waiter Order Detail not-found vs load-error semantics                               |       P1 | COMPLETED | 404/403/transient/stale semantics verified                                                   |
| UIE-550 | Fix Business/onboarding false-empty behavior                                                |       P1 | COMPLETED | failed org/franchise query cannot trigger onboarding                                         |
| UIE-560 | Fix Inventory/Staff/Tables/Admin false-empty and false-zero states                          |       P1 | COMPLETED | Inventory/Staff/Tables/Admin false-empty regressions verified                                |
| UIE-570 | Fix Waiter menu/order-entry dependency load failures                                        |       P1 | COMPLETED | Waiter order-entry dependency failures verified fail-closed                                  |
| UIE-580 | Replace generic Kitchen/Waiter mutation messages with structured errors                     |       P1 | COMPLETED | Kitchen/Waiter structured mutation errors verified                                           |
| UIE-600 | Surface Customer active-order refresh failures and stale state                              |       P1 | COMPLETED | active-order failure/stale behavior verified                                                 |
| UIE-610 | Add full Website client validation + inline backend errors                                  |       P1 | COMPLETED | Website validation and inline failure behavior verified                                      |
| UIE-700 | Standardize auth/permission/conflict/rate-limit UI semantics                                |       P1 | COMPLETED | auth/permission/conflict/rate-limit semantics verified                                       |
| UIE-710 | Standardize request-reference display for support-relevant failures                         |       P2 | COMPLETED | support request-reference policy verified                                                    |
| UIE-800 | Complete accessibility pass for field/form/query error states                               |       P1 | COMPLETED | ARIA/focus/live-region/retry accessibility contract verified                                 |
| UIE-810 | Complete safe frontend error telemetry/contract-drift reporting                             |       P2 | COMPLETED | safe telemetry and unknown-field contract-drift behavior verified                            |
| UIE-900 | Add P0 operational/financial regression suite                                               |       P0 | COMPLETED | mandatory P0 regression tests green                                                          |
| UIE-910 | Complete mechanical query/mutation/catch/default-value re-audit                             |       P0 | COMPLETED | final suppression/default/mutation re-audit clean                                            |
| UIE-920 | Final monorepo quality/build verification                                                   |       P0 | BLOCKED   | all runnable gates green; exact Bun API bundle + localhost Playwright blocked by environment |

## Form remediation matrix

Every row must eventually satisfy all columns: frontend validation, disabled-submit rules, backend field mapping, form-level errors, failed-submit preservation, and focused tests.

| Form/domain                      | Client validation | Disable until valid                   | Dirty-state Save           | Backend field errors inline               | Form-level error | Status    |
| -------------------------------- | ----------------- | ------------------------------------- | -------------------------- | ----------------------------------------- | ---------------- | --------- |
| Menu Item                        | IMPLEMENTED       | IMPLEMENTED                           | IMPLEMENTED                | IMPLEMENTED                               | IMPLEMENTED      | COMPLETED |
| Categories                       | IMPLEMENTED       | IMPLEMENTED                           | varies                     | IMPLEMENTED                               | IMPLEMENTED      | COMPLETED |
| Tags                             | COMPLETED         | COMPLETED                             | N/A                        | COMPLETED                                 | COMPLETED        | COMPLETED |
| Holidays                         | COMPLETED         | COMPLETED                             | N/A                        | COMPLETED                                 | COMPLETED        | COMPLETED |
| Templates                        | COMPLETED         | COMPLETED                             | varies                     | COMPLETED                                 | COMPLETED        | COMPLETED |
| Modifier Groups                  | COMPLETED         | COMPLETED                             | COMPLETED                  | COMPLETED                                 | COMPLETED        | COMPLETED |
| Combos                           | IMPLEMENTED       | IMPLEMENTED                           | IMPLEMENTED                | IMPLEMENTED                               | IMPLEMENTED      | COMPLETED |
| Pricing Rules                    | IMPLEMENTED       | IMPLEMENTED                           | IMPLEMENTED                | IMPLEMENTED                               | IMPLEMENTED      | COMPLETED |
| Branch Overrides                 | IMPLEMENTED       | IMPLEMENTED                           | IMPLEMENTED                | IMPLEMENTED                               | IMPLEMENTED      | COMPLETED |
| Promotions                       | IMPLEMENTED       | IMPLEMENTED                           | IMPLEMENTED                | IMPLEMENTED                               | IMPLEMENTED      | COMPLETED |
| Loyalty                          | IMPLEMENTED       | IMPLEMENTED                           | varies                     | IMPLEMENTED                               | IMPLEMENTED      | COMPLETED |
| Organization                     | COMPLETED         | COMPLETED                             | varies                     | COMPLETED                                 | COMPLETED        | COMPLETED |
| Franchise                        | COMPLETED         | COMPLETED                             | varies                     | COMPLETED                                 | COMPLETED        | COMPLETED |
| Branch                           | COMPLETED         | COMPLETED                             | varies                     | COMPLETED                                 | COMPLETED        | COMPLETED |
| Staff add/edit                   | COMPLETED         | COMPLETED                             | COMPLETED                  | COMPLETED                                 | COMPLETED        | COMPLETED |
| Roles/permissions editable forms | IMPLEMENTED       | IMPLEMENTED                           | IMPLEMENTED                | N/A/value assignment                      | IMPLEMENTED      | COMPLETED |
| Inventory Item                   | COMPLETED         | COMPLETED                             | varies                     | COMPLETED                                 | COMPLETED        | COMPLETED |
| Recipe/Sub-recipe                | IMPLEMENTED       | IMPLEMENTED                           | varies                     | IMPLEMENTED                               | IMPLEMENTED      | COMPLETED |
| Customer Groups                  | COMPLETED         | COMPLETED                             | varies                     | COMPLETED                                 | COMPLETED        | COMPLETED |
| Tables create/edit               | IMPLEMENTED       | IMPLEMENTED                           | IMPLEMENTED                | IMPLEMENTED                               | IMPLEMENTED      | COMPLETED |
| Settings                         | IMPLEMENTED       | IMPLEMENTED                           | IMPLEMENTED where editable | IMPLEMENTED                               | IMPLEMENTED      | COMPLETED |
| Profile                          | COMPLETED         | COMPLETED                             | COMPLETED                  | COMPLETED                                 | COMPLETED        | COMPLETED |
| Password change                  | COMPLETED         | COMPLETED                             | N/A                        | COMPLETED                                 | COMPLETED        | COMPLETED |
| Signup                           | COMPLETED         | COMPLETED                             | N/A                        | COMPLETED                                 | COMPLETED        | COMPLETED |
| Customer-facing editable forms   | REVIEWED          | IMPLEMENTED where locally constrained | varies                     | backend order errors are form/page scoped | IMPLEMENTED      | COMPLETED |
| Website Contact                  | COMPLETED         | COMPLETED                             | N/A                        | COMPLETED                                 | COMPLETED        | COMPLETED |
| Website Demo Request             | COMPLETED         | COMPLETED                             | N/A                        | COMPLETED                                 | COMPLETED        | COMPLETED |

## Critical query/error-state matrix

| Surface                  | Required behavior                           | Status    |
| ------------------------ | ------------------------------------------- | --------- |
| Print Bills              | query failure blocks fallback bill/printing | COMPLETED |
| Payment Dialog           | query failure blocks payment path selection | COMPLETED |
| Kitchen tickets          | query failure != zero tickets               | COMPLETED |
| Kitchen stations         | query failure != no stations                | COMPLETED |
| Waiter Home orders       | failure prevents false `All caught up`      | COMPLETED |
| Waiter customer requests | failure visible; no swallowed catch         | COMPLETED |
| Web Order Detail         | real 404 only -> not found                  | COMPLETED |
| Waiter Order Detail      | error state instead of blank/null           | COMPLETED |
| Business page            | load failure != onboarding                  | COMPLETED |
| Franchise loading        | failure != empty franchises                 | COMPLETED |
| Low-stock KPI            | failure != `0`                              | COMPLETED |
| Inventory lists          | failure != empty inventory                  | COMPLETED |
| Staff                    | failure != zero/empty staff                 | COMPLETED |
| Tables                   | failure != no tables                        | COMPLETED |
| Waiter menu dependencies | failure != unavailable/empty configuration  | COMPLETED |
| Branch Health            | explicit error + retry                      | COMPLETED |
| Customer active order    | refresh failure visible/preserves state     | COMPLETED |

## Known mutation remediation targets

| Module/action                               | Status    |
| ------------------------------------------- | --------- |
| Merge Order                                 | COMPLETED |
| Refire Item                                 | COMPLETED |
| Seat Share                                  | COMPLETED |
| Split Bill                                  | COMPLETED |
| Refill actions                              | COMPLETED |
| Menu tag delete                             | COMPLETED |
| Holiday delete                              | COMPLETED |
| Menu item delete                            | COMPLETED |
| Template delete                             | COMPLETED |
| Kitchen station create/delete/routing       | COMPLETED |
| Channel overrides                           | COMPLETED |
| Promotions CRUD                             | COMPLETED |
| Loyalty CRUD                                | COMPLETED |
| Menu schedules                              | COMPLETED |
| Waiter request resolve direct async handler | COMPLETED |
| Remaining mutations discovered by UIE-000   | COMPLETED |

## Phase gates

### Gate A — Shared UI contract

- [x] UIE-000 complete
- [x] UIE-100 complete
- [x] UIE-110 complete
- [x] UIE-120 complete
- [x] UIE-130 complete

### Gate B — P0 safety

- [x] UIE-500 complete
- [x] UIE-510 complete
- [x] UIE-520 complete
- [x] UIE-530 complete
- [x] UIE-900 P0 regression tests green

### Gate C — Query correctness

- [x] UIE-300 complete
- [x] UIE-310 complete
- [x] UIE-540 complete
- [x] UIE-550 complete
- [x] UIE-560 complete
- [x] UIE-570 complete

### Gate D — Mutation completeness

- [x] UIE-400 complete
- [x] UIE-580 complete
- [x] zero user-triggered mutations without visible failure treatment

### Gate E — Form validation complete

- [x] UIE-200 complete
- [x] UIE-210 complete
- [x] UIE-220 complete
- [x] UIE-230 complete
- [x] all rows in Form remediation matrix verified
- [x] all standard create forms disable submit while client-invalid/pending
- [x] all standard edit forms also respect dirty state
- [x] backend field errors render under exact fields

### Gate F — Customer/Website and semantic polish

- [x] UIE-600 complete
- [x] UIE-610 complete
- [x] UIE-700 complete
- [x] UIE-710 complete

### Gate G — Accessibility/telemetry

- [x] UIE-800 complete
- [x] UIE-810 complete

### Gate H — Release-ready

- [x] UIE-910 complete
- [x] typecheck passes
- [x] all tests pass
- [x] lint passes
- [x] format check passes
- [ ] build passes
- [ ] no remaining `PENDING`, `IN_PROGRESS`, or `BLOCKED` items in agreed scope

## Mandatory form acceptance checklist

A form cannot be marked `COMPLETED` until all applicable items are true:

- [x] client validation exists for locally knowable constraints
- [x] invalid client form does not send the request
- [x] primary submit action disabled while client-invalid
- [x] primary action disabled while submitting/mutation pending
- [x] required remote dependencies loading/failed block submission when necessary
- [x] edit Save disabled when unchanged unless intentionally documented otherwise
- [x] pending label shown (`Creating...`, `Saving...`, etc.)
- [x] backend `fieldErrors` mapped under exact fields
- [x] first invalid server field focused/scrolled into view where practical
- [x] unknown backend field errors reach form summary
- [x] non-field business errors rendered in form/dialog scope
- [x] failed submission preserves all entered data
- [x] failed submission does not close/reset form
- [x] editing a field clears/revalidates stale server error appropriately
- [x] no duplicate generic toast when inline errors already explain the failure
- [x] error state accessible through labels/ARIA/focus behavior
- [x] focused regression tests pass

## Mandatory architecture acceptance checklist

Every UI error-handling task must also satisfy the following before it can be marked `COMPLETED`:

- [x] main React component remains declarative and focused on composition/interaction
- [x] one meaningful component per file is preserved in touched code
- [x] no raw Axios/fetch response parsing or backend-envelope parsing inside JSX/components
- [x] generic error normalization stays in `packages/api-client`
- [x] reusable error presentation uses shared UI primitives instead of duplicated per-page markup where appropriate
- [x] complex query logic is extracted to/reused from feature query hooks
- [x] complex mutation logic is extracted to/reused from feature mutation hooks when cache invalidation/common behavior is involved
- [x] complex form submit/error/dependency logic is extracted to/reused from a form hook when necessary
- [x] frontend validation rules live in schema/validation files rather than scattered submit-handler conditionals
- [x] form/request and response/view-model transformation logic lives in mapper/helper files when non-trivial
- [x] service/API calls stay in service/API modules or established feature hooks, not presentational components
- [x] shared/domain constants are not duplicated as hardcoded behavioral values across JSX
- [x] no duplicate error helper introduced when an existing helper can be extended
- [x] no new `any`, validation weakening, authorization weakening, or unrelated refactor
- [x] existing alias-import and arrow-function conventions are preserved
- [x] changed components are split when they accumulate multiple data/error/form/rendering responsibilities
- [x] relevant architecture/helper/hook/component tests pass

## Architecture review matrix

For each touched feature/module, record the resulting ownership before completion:

| Responsibility                    | Expected owner                                        | Verified |
| --------------------------------- | ----------------------------------------------------- | -------- |
| API/transport error normalization | `packages/api-client`                                 | [x]      |
| Shared UI error classification    | shared error helper                                   | [x]      |
| Reusable error rendering          | `packages/ui` / shared component                      | [x]      |
| Query construction/cache policy   | feature query hook                                    | [x]      |
| Mutation/cache invalidation       | feature mutation hook                                 | [x]      |
| Form state/submit orchestration   | component or dedicated form hook depending complexity | [x]      |
| Client validation rules           | schema/validation file                                | [x]      |
| Backend field mapping             | shared/domain helper                                  | [x]      |
| Request/response mapping          | mapper/helper when non-trivial                        | [x]      |
| Page/dialog component             | declarative rendering + interactions                  | [x]      |

## Implementation progress log — 2026-09-18

### Completed safety/query batch

- `UIE-500` Print Bills: bill-query loading/error now blocks fallback bill generation and printing.
- `UIE-510` Payment: bill-query loading/error now blocks payment path selection/submission.
- `UIE-520` Kitchen: initial ticket failure cannot render a healthy zero queue; cached data remains visible with stale warning.
- `UIE-530` Waiter Home: order/request failures cannot render `All caught up`; request polling/realtime/resolve logic moved into feature hooks.
- `UIE-540` Order Detail: Web and Waiter distinguish real 404, 403, transient load failure, and stale cached data.
- `UIE-550` Business: organization/franchise failures no longer become onboarding/empty-franchise business data.
- `UIE-600` Customer active order: refresh failure is visible, cached order remains available, and no-cache failure blocks duplicate ordering with Retry.
- `UIE-900` P0 regression coverage added for financial and operational false-success states.

### Form-remediation progress

- Combos: added extracted validation/payload/error-mapping helpers, invalid-submit blocking, edit dirty-state blocking, inline backend field-error mapping, form-level business errors, failed-submit preservation, combo-list/menu-item dependency error states, and stale-data warnings. Focused tests were added; execution is pending in this checkpoint environment because Bun/dependencies are not installed.

### Query-correctness progress

- Inventory: failed inventory/low-stock reads no longer render healthy empty/zero values.
- Staff: failed staff/role reads render explicit retryable error states.
- Tables: failed tables read cannot render `No tables yet`; failed open-orders read blocks transfer/merge.
- Branch Health: initial failure renders explicit Retry; cached refresh failure is marked stale.
- Shared `QueryErrorState` and `StaleDataBanner` primitives are integrated across touched modules.

### Targeted verification

- Billing safety: 6/6 tests passed.
- Kitchen P0 behavior: 8/8 tests passed.
- Waiter Home/request hook: 7/7 tests passed.
- Web Order Detail + Business: 15/15 tests passed.
- Waiter Order Detail: 3/3 tests passed.
- Tables: 7/7 tests passed.
- Inventory + Staff: 11/11 tests passed.
- Branch Health: 2/2 tests passed.
- Customer active-order/session behavior: 17/17 tests passed.

## Continued implementation progress — 2026-09-18

- Waiter menu/order-entry dependencies now fail closed for required catalog/config reads and show stale warnings when cached data exists.
- Pricing Rules, Branch Overrides, Promotions, Loyalty, Recipes/Sub-recipes, categories, roles/permissions, Settings, schedules, channel overrides, buffet/per-cover pricing, Happy Hour, organization defaults, Web Create Order, Kitchen station routing, and Differentiators query dependencies were remediated to the shared error contract.
- Shared API error presentation now classifies auth, permission, not-found, conflict, rate-limit, timeout/network, server, validation, business, and unexpected failures. Support request references are restricted to support-relevant failures.
- Tables create/edit now has valid/dirty/dependency submit blocking and form-level backend errors.
- Final audit additionally fixed Waiter cancellation reasons, transfer destinations, menu engineering, bulk menu mutation error preservation, and failed menu-import validation preservation.
- Mechanical audit: 494 non-test UI source files inventoried; 1,852 source TS/TSX files covered by workspace typechecks with zero TypeScript errors; no unreviewed error-to-empty default file remains; only two intentional infrastructure suppression patterns remain. See `docs/UI_ERROR_HANDLING_AUDIT.md`.
- Final verification rerun on 2026-09-19: 713 test files / 2,876 tests passed; all 15 TypeScript workspaces green; root ESLint and Prettier green; Web/Waiter/Kitchen/Customer/Website production builds green. Exact API `bun build` remains environment-blocked because Bun 1.3.14 is unavailable in the container; Playwright browser navigation to localhost is blocked by administrator policy, with equivalent DOM-level accessibility integration coverage green.

## Agent handoff format

After each task, append/update:

```text
Task: UIE-xxx
Status: COMPLETED
Modules/forms changed:
- ...
Tests added/updated:
- ...
Verification:
- command -> PASS/FAIL
Audit follow-ups:
- ...
```

Do not mark a task complete based only on code presence. Its listed verification and applicable acceptance criteria must pass.

Task: UIE-920 — Final verification closure
Status: BLOCKED (environment-only)
Modules/forms changed:

- all agreed UI error-handling scope is source-complete and verified
- final accessibility integration coverage added under Web auth tests
  Tests added/updated:
- Web accessibility integration: first-invalid focus, `aria-invalid`, `aria-describedby`, keyboard-focusable password action
- existing shared UI error/stale/form primitives remain covered
  Verification:
- 713 test files / 2,876 tests -> PASS
- 15 TypeScript workspaces -> PASS
- root ESLint -> PASS
- root Prettier check -> PASS
- Web/Waiter/Kitchen/Customer/Website production builds -> PASS
- API exact `bun build` -> BLOCKED (Bun 1.3.14 runtime unavailable in container)
- Playwright browser navigation -> BLOCKED (`ERR_BLOCKED_BY_ADMINISTRATOR` for localhost; DOM-level equivalent accessibility tests pass)
  Audit follow-ups:
- run the exact Bun API bundle command and Playwright accessibility suite in an environment where Bun and localhost browser navigation are permitted; no known source/test failure remains
