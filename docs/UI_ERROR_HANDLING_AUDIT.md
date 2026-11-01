# Servora UI Error Handling — Final Mechanical Audit

Date: 2026-09-19

## Scope

Source and runtime audit covers `apps/web`, `apps/waiter-app`, `apps/kitchen-display`, `apps/customer-app`, `apps/website`, `apps/api`, and shared packages involved in the UI error contract.

Current mechanical inventory:

- 49 direct `useQuery(...)` declarations
- 132 direct `useMutation(...)` declarations
- 130 `.mutate(...)` call sites
- 24 React Hook Form declarations
- 1,852 source TypeScript/TSX files covered by workspace typechecks
- zero TypeScript errors across all 15 TypeScript workspaces

## Required-failure audit results

### Error-to-empty/default state

The final query/default scan found no unreviewed business-data path where a failed request is intentionally converted into a valid empty, zero, onboarding, not-found, or unavailable state. Known false-empty cases were remediated in Web, Waiter, Kitchen, Customer, and shared operational flows.

### Silent catch/suppression scan

Two suppression-shaped production patterns remain and are intentional infrastructure behavior:

1. `packages/observability/src/index.ts` — telemetry delivery is best-effort and must not break the user flow when telemetry transport fails.
2. `apps/customer-app/src/shared/api/client.ts` — error-response JSON parsing may legitimately fail for an empty/non-JSON body, after which HTTP status/error normalization still continues.

Additional empty catches found by the grep pass are test-only scaffolding. No business-critical production path retains `catch(() => [])`, `catch(() => undefined)`, an empty catch, or equivalent business-data suppression.

### Mutation error ownership

The final mutation inventory confirms user-triggered failures either render locally or flow through an explicit shared error policy. Remediated paths include Waiter order/table actions, Kitchen ticket mutations, menu bulk actions, modifier-group delete, item availability, branch overrides, schedules, promotions, loyalty, export/import, and direct request handlers.

### Form contract

The known form matrix is source-complete and regression-tested for applicable behavior:

- frontend validation for locally knowable constraints
- invalid/pending/dependency submit blocking
- dirty-state protection for edit saves where applicable
- backend `fieldErrors` rendered inline
- non-field business errors rendered at form/dialog/page scope
- failed submissions preserve entered values and remain open
- unknown backend field keys fall back to the form summary and are observable as contract drift

### Accessibility

Accessibility acceptance is covered by shared primitive tests plus a Web integration test against the production Login form:

- field errors use `aria-invalid` and `aria-describedby`
- the first invalid field receives focus after failed client validation
- form/query error regions expose alert/status semantics
- retry/action buttons remain native keyboard-operable controls
- password visibility control is keyboard-focusable

A Playwright browser version of the accessibility test was also added under `apps/web/tests/accessibility`. In this execution sandbox Chromium is prevented by administrator policy from navigating to localhost (`ERR_BLOCKED_BY_ADMINISTRATOR`), even though the Vite server is reachable by `curl`. The equivalent DOM-level integration tests pass.

## Runtime verification evidence

### Tests

- API: 319 files / 1,853 tests passed
- Web: 174 files / 455 tests passed
- Waiter: 74 files / 130 tests passed
- Kitchen: 29 files / 78 tests passed
- Customer: 33 files / 108 tests passed
- Website: 7 files / 25 tests passed
- Shared packages: 77 files / 227 tests passed
- Total: 713 files / 2,876 tests passed

### TypeScript

All 15 TypeScript workspaces passed `tsc --noEmit` using the restored dependency tree:

- API
- Web
- Waiter
- Kitchen Display
- Customer
- Website
- API Client
- Config
- Contracts
- Observability
- Realtime
- SEO
- Types
- UI
- Validation

### Static quality gates

- root ESLint: PASS
- root Prettier check: PASS

### Production builds

- Web Vite production build: PASS
- Waiter Vite production build: PASS
- Kitchen Vite production build: PASS
- Customer Vite production build: PASS
- Website Next.js production build: compile/typecheck/static generation/build artifacts completed successfully

The exact API bundle command remains environment-only blocked because this container does not provide the project-pinned Bun 1.3.14 runtime. API typecheck and the full 1,853-test suite are green, so there is no known source/test failure in the API.

## Remaining environment-only release checks

No source implementation item remains `PENDING` or `IN_PROGRESS` in the agreed UI error-handling scope. `UIE-920` remains `BLOCKED` only for two execution-environment reasons:

1. exact API `bun build` cannot run without Bun 1.3.14;
2. Chromium localhost navigation is blocked by administrator policy, preventing the Playwright accessibility transport despite equivalent integration coverage passing.

These are release-environment checks, not known application failures.
