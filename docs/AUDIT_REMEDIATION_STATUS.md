# Servora audit remediation

Verified locally on 31 October 2026 against the supplied `servora_2(1).zip` and `Servora_Application_Audit.md`.

The audit's architecture is retained. All thirteen findings have implementation changes or an updated acceptance record below. **This is not release certification:** PostgreSQL acceptance, native Bun execution, real payment-provider behavior, deployed browser/network behavior, and production configuration remain open.

## Current acceptance matrix

| Finding                             | Implementation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Evidence and remaining acceptance                                                                                                                                                                                                                                                                                            |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1: Billing authorization           | Reject branchless, branch-scoped writes before repository calls and before transactions; assert resolved branches inside transactions. Cover payment, refund, split and seat-share writes. Authorize merged billing parents separately and scope merged reads and order updates to tenant/branch.                                                                                                                                                                                                                 | Unit and real Elysia HTTP regressions pass. Tests assert no write calls and no transaction entry when denied. PostgreSQL suite adds persisted-state checks; not executed locally.                                                                                                                                            |
| F2: Payment concurrency and retries | Acquire the canonical order's PostgreSQL advisory transaction lock before bill creation or balance reads; re-read the order after locking. Split writers use the same lock convention. Compare due in integer cents. Persist request key, fingerprint and payment association in a new additive table, atomically with payment. Identical retries reuse the payment; changed payloads return `PAYMENT_IDEMPOTENCY_CONFLICT`. The payment dialog retains a key per payload for retries during the collection flow. | Lock-ordering, replay, conflict, service and dialog regressions pass. Seven opt-in PostgreSQL tests cover no-write denials, scope, simultaneous first payments, duplicate requests, merges and split balances; not executed locally. Keys are optional for API compatibility: callers must reuse a key for retry protection. |
| F3: Customer socket churn           | Use React 19.2 effect events for callbacks so connection setup depends on session/order identity. Stabilize individual session dependencies; ignore events after effect cleanup. Preserve independent 15-second HTTP polling.                                                                                                                                                                                                                                                                                     | Full Customer suite passes, including rerender/connected-frame tests with the real realtime hook and latest callbacks.                                                                                                                                                                                                       |
| F4: Waiter cache shape              | Cache the common orders envelope; project merge candidates with observer `select`.                                                                                                                                                                                                                                                                                                                                                                                                                                | Both load orders tested with real hooks and one fresh QueryClient. Page consumers retain pagination and candidates receive items without a second fetch.                                                                                                                                                                     |
| F5: Menu dependencies               | Capture mutation scope in `onMutate`; invalidate management, active menus for every fulfillment type, categories and availability in the affected franchise. Branch override changes narrow ordering/availability invalidation to the affected branch and preserve the edit key captured at request start.                                                                                                                                                                                                        | Real QueryClient tests cover publish/unpublish, assignment/removal, branch isolation, other tenants, and a hook rerender during a scope switch.                                                                                                                                                                              |
| F6: Operational recovery            | Poll mounted Admin order lists, details and tables every 15 seconds, independently of socket connection status. Existing event invalidation remains.                                                                                                                                                                                                                                                                                                                                                              | A real QueryClient/timer regression changes order status and occupancy with no event, focus, network reconnect or remount. Deployed silent-disconnect and browser recovery checks remain open.                                                                                                                               |
| F7: Stale WebSocket handlers        | Capture each socket in every handler; ignore stale instances. Detach handlers before deliberate disconnect and reconnect only with a current token and subscribers.                                                                                                                                                                                                                                                                                                                                               | Shared realtime suite passes, including delayed close/message/error delivery across a branch switch.                                                                                                                                                                                                                         |
| F8: Orders error UI                 | Render initial retrieval failures with retry; keep cached orders visible with a stale-data warning after background failures.                                                                                                                                                                                                                                                                                                                                                                                     | Separate initial-error, background-error, retry and existing empty/data tests pass.                                                                                                                                                                                                                                          |
| F9: Bundle budgets                  | Declare audited package side effects explicitly, retaining realtime format registration and CSS. Defer login UI in Waiter/Kitchen so authenticated startup does not load the forms. Preserve public exports and types.                                                                                                                                                                                                                                                                                            | All four Vite builds pass the existing chunk and total-JS gates; measurements below. No budget was raised. Real-device startup profiling remains open.                                                                                                                                                                       |
| F10: Availability waterfall         | Validate all memberships first, deduplicate item contexts and process independent availability reads in batches of at most four with one captured `asOf`. Preserve all stock quantities and authoritative stock validation.                                                                                                                                                                                                                                                                                       | Customer order tests cover membership-first failure, seven reads for nine lines, concurrency greater than one and at most four, one `asOf`, and unchanged stock input. Live PostgreSQL latency/query profiling remains open.                                                                                                 |
| F11: Lead limiter retention         | Use a bounded sliding-window TTL store with expired-key sweeps and fail-closed capacity handling. Accept forwarded IP headers only when explicitly configured as trusted, and validate their IP syntax.                                                                                                                                                                                                                                                                                                           | Website suite covers capacity, expiry, sliding windows and existing delivery/validation behavior. Local fallback is process-local; multi-instance deployments need a shared ingress limiter and verified proxy settings.                                                                                                     |
| F12: Cart composition               | Replace the mode-driven cart with explicit New Order and Add Round compositions using focused cart state/actions/checkout interfaces and shared line/checkout primitives. Per-line course handlers belong only to New Order; round course selection belongs only to Add Round.                                                                                                                                                                                                                                    | Existing cart and MenuPage interactions pass through both public compositions. The impossible add-round/table-required fixture is removed; New Order still tests required-table behavior.                                                                                                                                    |
| F13: Trackers                       | One current matrix with dated evidence and explicit open acceptance; previous Query/architecture checkpoints moved to linked historical records.                                                                                                                                                                                                                                                                                                                                                                  | This document supersedes historical completion claims.                                                                                                                                                                                                                                                                       |

## Verification

Results: **3,001 distinct tests passed; seven PostgreSQL tests skipped**, across full workspace runs and focused follow-up checks. All **15 workspace typechecks and 15 workspace lint runs passed**; changed source files were checked again after follow-up edits. All **five frontend builds passed**, and all four Vite applications passed the existing bundle gate. The native Bun API build remains blocked as described below.

| Workspace            | Passing tests | Skipped tests |
| -------------------- | ------------- | ------------- |
| API                  | 1,879         | 7             |
| Admin                | 526           | 0             |
| Waiter               | 139           | 0             |
| Kitchen              | 80            | 0             |
| Customer             | 115           | 0             |
| Website              | 27            | 0             |
| Nine shared packages | 235           | 0             |
| Total                | 3,001         | 7             |

Migration integrity verifies 80 SQL/journal/snapshot units. Dependency boundaries, transport boundaries, dead code, UI conventions, permissions, environment examples and SEO assets pass. Repository formatting passes. The production SEO configuration check remains open: all four unconfigured Vite apps report missing absolute app-specific OG image metadata.

Commands below use the repository's existing tools; see the environment note for the local execution difference.

- TypeScript: `tsc --noEmit` from each of the 15 workspaces.
- ESLint: `eslint '<workspace>/**/*.{ts,tsx}'` from the repository root, one process per workspace.
- Tests: `vitest run --maxWorkers=2 --minWorkers=1` from each workspace. Seven PostgreSQL tests deliberately skip without `BILLING_TEST_DATABASE_URL`.
- Frontends: `vite build` from all four Vite applications; `next build` from the website.
- Contracts: export `apps/api/scripts/export-openapi.ts`, then run `node scripts/contracts/generate-openapi-contract.mjs --skip-export` and repeat with `--check`. Fresh export: 229 operations / 267 schemas.
- Static gates: migration integrity, permissions, dependency boundaries, transport boundaries, UI conventions, dead code, environment examples, SEO assets and frontend budgets.

### Production JavaScript measurements

All values are uncompressed KiB, matching the existing budget script. Before values are the audit's measurements; after values are this checkout's fresh builds. These are not real-device execution or network transfer measurements.

| App      | Before total / largest | After total / largest | 650 KiB chunk gate |
| -------- | ---------------------- | --------------------- | ------------------ |
| Admin    | 1,323.2 / 384.0        | 1,273.5 / 313.2       | Pass               |
| Waiter   | 878.8 / 712.1          | 816.4 / 518.6         | Pass               |
| Kitchen  | 681.5 / 681.5          | 615.9 / 525.8         | Pass               |
| Customer | 568.4 / 568.4          | 515.4 / 515.4         | Pass               |

### Local environment limits

Bun 1.3.14 was obtained, but frozen installation returned an internal `NotDir` and a trivial Bun script crashed. Tests/builds instead used an isolated npm toolchain with direct dependency versions selected from `bun.lock`; project dependency versions and the lockfile were preserved. npm transitive resolution is not proof of a native frozen Bun installation.

A runtime-only adapter handles unavailable `/proc` process-memory statistics for Node tooling. No application behavior is patched by that adapter. It is not required by the delivered source.

The PostgreSQL suite is present and typechecked but is **not counted as passing**. No PostgreSQL/Redis/Razorpay deployment or real browser E2E session was exercised. The Vite builds still warn that `VITE_PUBLIC_APP_URL` is unset. Production environment values, trusted ingress behavior and absolute SEO metadata must be verified in the intended deployment.

## Database acceptance command

Use a disposable PostgreSQL database with permission to create and drop schemas:

```sh
cd apps/api
BILLING_TEST_DATABASE_URL=postgres://user:password@localhost:5432/servora_test \
  bun run test:billing:postgres
```

The suite applies all migrations and fixtures in a unique `billing_test_*` schema, then drops that schema. It does not use public application tables. Migration `0079_create_payment_collection_requests.sql` must also be applied through the normal deployment migration process before collecting payments with request keys.

## Review and release order

1. Billing authorization, canonical locking, idempotency contract, migration and regressions.
2. Shared and Customer socket lifecycle, plus Waiter cache shape.
3. Menu synchronization, operational polling and error UI.
4. Bundle loading, availability reads, bounded lead limiter and cart composition.
5. Documentation and generated OpenAPI changes, followed by database/browser/provider/deployment acceptance.

The supplied Git index and existing unstaged work are preserved. No broad cleanup commit, history rewrite, push, migration against an existing database, or deployment was performed.

## Continuation: required acceptance gates

A follow-up on 31 October 2026 found that CI provided `DATABASE_URL` but omitted `BILLING_TEST_DATABASE_URL`. The seven billing database tests would therefore silently skip during the ordinary unit-test job.

- Added `test:billing:postgres` at the root and API workspace, backed by a runner that refuses a missing or non-PostgreSQL test URL. It deliberately never falls back to the general `DATABASE_URL`; the caller must explicitly select a disposable test database. The guard was exercised locally for both failure cases and did not expose supplied credentials.
- CI now runs the guarded billing acceptance command against its PostgreSQL 16 service. The release-baseline plan includes the same required step.
- Added a CI browser job with Chromium installation, Admin browser acceptance, website route/accessibility acceptance, and failure reports. Production migration now depends on both quality and browser jobs.
- Website Playwright configuration now forbids focused tests in CI, limits CI workers, retries failures twice and avoids reusing an unrelated running server in CI.
- Playwright test discovery passed for **three Admin tests and twelve website tests**. Discovery is not a passing browser execution. No browser snapshots or test results are claimed from this continuation.

The local Bun probe still crashes. No test database URL was supplied, PostgreSQL cannot be started under the available process identity, and Chromium downloads/execution failed in this managed environment. These are still open acceptance checks, not fixes certified by CI results: **the edited workflow has not been pushed or executed on GitHub**.

To finish acceptance, run this checkout's CI in the repository, or run the guarded database command and browser suites in an environment that supports Bun, PostgreSQL and Chromium. Real Redis/Razorpay, deployed network recovery, proxy/shared-limiter settings and production configuration remain separate deployment checks.
