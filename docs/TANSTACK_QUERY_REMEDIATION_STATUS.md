# Servora TanStack Query Remediation Status

## Verified checkpoint — Customer structural and runtime remediation (2026-09-26)

- Status: `COMPLETED` for the Customer cross-app implementation slice. Web, Waiter, Kitchen, and Customer now have verified checkpoints; the final cross-app audit remains pending.
- Customer bootstrap, session, order, and realtime cache identities now use canonical keys that include the QR/storage scope and active session token. A session or table scope cannot reuse another session's menu or order data.
- Bootstrap query ownership moved into the Customer feature `query/` layer. React consumers obtain the active client with `useQueryClient()`, while lifecycle helpers receive it explicitly. The production feature scan found no singleton query-client import in React feature code.
- Invalid persisted sessions now cancel and remove the active session query family before persisted session/order state is cleared or replaced. The customer experience subtree remounts when its storage scope or session token changes, clearing local view state from the prior identity.
- TanStack `AbortSignal` reaches the existing request configuration for customer menu and order reads. Session/order creation, checkout, payment, and service-request mutations were not changed.
- Existing retry behavior, 15-second order polling fallback, realtime cache updates, initial loading behavior, and background refresh behavior were preserved. Realtime delivery remains unverified, so polling remains the correctness fallback.
- Customer has no paginated TanStack list in this audited slice; `keepPreviousData` does not apply.
- Verification on the final Customer source:
  - full Customer suite: **36 files / 112 tests passed**;
  - full Customer `tsc --noEmit`: **PASS**;
  - Customer production build: **PASS**;
  - `@pos/api-client`: **6 files / 39 tests passed**, typecheck included in the passing root workspace gate;
  - root `bun run typecheck --force`: **PASS, 15/15 workspaces, 0 cache hits**;
  - root `bun run test --force`: **PASS, 21/21 Turbo tasks, 726 test files / 2,959 tests, 0 cache hits**;
  - root `bun run lint`: **PASS**.
- Stop point: package and report this Customer checkpoint. The next phase is the final cross-app audit and status reconciliation.

## Verified checkpoint — Kitchen structural and runtime remediation (2026-09-26)

- Status: `COMPLETED` for the Kitchen cross-app slice. Customer remains pending.
- Kitchen ticket and station cache identities now include the active tenant and branch. Ticket-status mutations invalidate only the current contextual ticket family, and realtime handlers update only the active station/context cache entry.
- Kitchen reads now follow the feature `api/`, `query/`, and `hooks/` structure. Canonical keys and reusable query definitions are owned by the Kitchen feature rather than pages or components.
- Login membership/branch activation cancels active queries and clears cached server state before persisted context changes. Kitchen access now requires an active branch; a sole active branch is selected automatically and multiple active branches use the existing selector.
- Logout, failed session restoration, login reset/error, and token refresh failure use the same cancel-then-clear lifecycle before local context is removed or the app reloads. The board remount key includes tenant, branch, and context revision.
- TanStack `AbortSignal` reaches the existing Axios GET configuration for kitchen tickets and stations. The ticket-status mutation transport was not changed.
- Existing 20-second polling, realtime updates, blocking initial loading, stale-data display, manual refresh, and background-fetch semantics were preserved. Polling remains the correctness fallback because realtime delivery is still unverified.
- Root testing exposed an API auth-service test whose two production-cost bcrypt signup paths exceeded Vitest's five-second default under parallel load. Only that test timeout was raised; it passed three consecutive focused runs and then passed under the full root load.
- Verification on the final Kitchen source:
  - full Kitchen suite: **31 files / 81 tests passed**;
  - full Kitchen `tsc --noEmit`: **PASS**;
  - Kitchen production build: **PASS**;
  - `@pos/api-client`: **6 files / 39 tests passed**, `tsc --noEmit` **PASS**;
  - root `bun run typecheck --force`: **PASS, 15/15 workspaces, 0 cache hits**;
  - root `bun run test --force`: **PASS, 21/21 Turbo tasks, 723 test files / 2,955 tests, 0 cache hits**;
  - root `bun run lint`: **PASS**.
- Stop point: package and report this Kitchen checkpoint. Customer is the next implementation phase.

## Verified checkpoint — Waiter structural and runtime remediation (2026-09-26)

- Status: `COMPLETED` for the Waiter cross-app slice. Kitchen and Customer remain pending.
- Waiter Menu, Orders, Tables, customer search/groups/requests, branch, and tenant-setting cache identities now include the active tenant and branch. Realtime handlers and mutations invalidate the current resource family instead of global or unrelated cache entries.
- Order-dialog query and mutation ownership moved out of pages/components into feature hooks. The production Waiter page/component scan has no direct TanStack query, mutation, query-client, literal query-key, or invalidation ownership.
- Login membership/branch activation cancels active queries and clears cached server state before persisted request context changes. Logout, failed bootstrap, login reset/error, and token refresh failure use the same cancel-then-clear lifecycle before local context is removed or the app reloads.
- TanStack `AbortSignal` reaches eligible Waiter reads for Orders and cancellation reasons, Menu categories/active menus/combos/promotions/price rules, Tables, Branches, customer search/groups/requests, and merge candidates. Mutation transports were not changed.
- Orders page pagination retains the previous page while the next page loads. Existing blocking-loading, stale-data, retry, polling, and background-fetch UI semantics were preserved.
- Verification on the final Waiter source:
  - full Waiter suite: **75 files / 136 tests passed**;
  - full Waiter `tsc --noEmit`: **PASS**;
  - `@pos/api-client`: **6 files / 39 tests passed**, `tsc --noEmit` **PASS**;
  - focused Web compatibility check after the shared customer-group signal signature: **2 files / 3 tests passed**, Web `tsc --noEmit` **PASS**;
  - root `bun run typecheck --force`: **PASS, 15/15 workspaces, 0 cache hits**;
  - root `bun run test --force`: **PASS, 21/21 Turbo tasks, 721 test files / 2,952 tests, 0 cache hits**.
- Realtime delivery remains unverified and polling remains enabled as the correctness fallback.
- Stop point: package and report this Waiter checkpoint. Kitchen is the next implementation phase.

## Checkpoint correction — full root test closeout (2026-09-26)

- Root `bun run test --force` initially exposed two classes of missed regressions: a brittle API request-duration test whose global `Date.now()` mock was consumed by framework internals, and Web tests whose full React Query mocks had not been updated for provider-owned `useQueryClient()` and signal-aware query functions.
- Request timing now accepts an injected clock in the request-context and request-logging plugins. Production still defaults to `Date.now`; the test supplies a deterministic clock and passed five consecutive focused runs.
- Updated the affected Web mocks and expectations for `QueryClient`, `useQueryClient()`, `AbortSignal`, functional key factories, and the added service signal parameter. Branch switching now uses the hook's current `contextPending` value directly.
- Final uncached repository verification:
  - root `bun run test --force`: **PASS, 21/21 Turbo tasks, 720 test files / 2,947 tests, 0 cache hits**;
  - root `bun run typecheck --force`: **PASS, 15/15 workspaces, 0 cache hits**;
  - focused formerly failing Web set: **12 files / 38 tests passed**;
  - request-logging regression: **2 tests passed in each of 5 consecutive runs**.
- The full Waiter structural/TanStack migration remains **PENDING**. The only Waiter source change in this closeout remains the table-query compatibility adapter described below.

## Checkpoint correction — root typecheck compatibility (2026-09-26)

- The Web runtime-closeout checkpoint passed the two reported package typechecks, but its shared table-list signal signature broke Waiter's direct `queryFn: fetchTables` assignment. Root `bun run typecheck --force` reproduced TS2769 and downstream table-data inference errors. This was a cross-app regression introduced by the Web closeout, not an existing Waiter migration issue.
- Fixed Waiter's table query adapter to call `fetchTables(signal)` using TanStack's query context. No mutation behavior or wider Waiter structure was changed.
- Updated the hook regression test and added transport signal forwarding coverage.
- Verification after the correction: root `bun run typecheck --force` **PASS, 15/15 workspaces, no cache hits**; targeted Waiter table API/hook and Menu page suites **PASS, 4 files / 7 tests**.
- This supersedes the previous checkpoint for use as the next baseline. Earlier Web/API-client test counts below are historical evidence; this correction reran the full workspace typecheck and the affected Waiter tests.
- Waiter's full structural/TanStack migration remains **PENDING**. The Waiter changes here are limited to compatibility with the shared API signature.

## Verified checkpoint — Web runtime closeout (2026-09-26)

- Status: `COMPLETED` for the requested Web runtime-closeout slice only. Overall remediation remains `IN_PROGRESS`; Waiter, Kitchen, and Customer rollout is pending.
- Source: downloaded `servora-tanstack-web-runtime-policy-checkpoint.zip`, SHA-256 `f80c456f7f51cc7fd277d87551db7739fc930f9bdbd81d84f3a0e35ed0a1a4c2`. No GitHub source was used.
- React feature hooks and shared React cache consumers now obtain their client through `useQueryClient()`. Menu invalidation and Orders realtime helpers receive that client explicitly. Singleton imports remain only at app initialization and non-React auth/transport infrastructure.
- Auth-store transitions cancel active queries synchronously and clear cache before changing request context. Login/logout and membership/branch changes advance a context revision. Logout and expired bootstrap clear persisted context. Bootstrap and context refresh reject stale replies after logout, a new login, or a newer context switch.
- The routed dashboard subtree includes user, franchise, membership, branch, and context revision in its remount key; it waits while membership permissions are loading. Failed activation clears persisted context, and authentication failures expire the session.
- TanStack signals reach existing Axios GET configuration through query options/hooks, services, and shared API methods for Orders (including cancellation reasons), Tables/QR, Inventory (list, low stock, transactions, waste reasons, recipe impact), Availability, Analytics, Operations fanout, Staff/Roles/Permissions, Branches, Billing reads, and Settings/approval thresholds. Mutation transports were not changed. Token-level comparison verified all 41 non-read methods in touched API domain files were unchanged.
- Staff and Inventory paginated queries use `keepPreviousData`. Runtime tests verify retained rows, non-blocking loading state during page changes/background fetches, and replacement with the next page. Existing blocking-loader versus refresh-button semantics were retained after the Web feature scan.
- Inventory realtime now invalidates contextual item pages and low-stock data instead of treating a paginated result as an array. Orders stale-event handling remains tested. WebSocket delivery remains unverified and is not a polling/correctness dependency.
- Verification on the final source:
  - focused Web runtime/lifecycle/query-option/hook/realtime/layout/service suite: **45 files / 161 tests passed**;
  - configured `@pos/api-client` test suite: **6 files / 39 tests passed**;
  - full Web `tsc --noEmit`: **PASS**;
  - `@pos/api-client` `tsc --noEmit`: **PASS**;
  - no source changes in Waiter, Kitchen, or Customer;
  - dependencies reconstructed from the available local dependency tree; its `bun.lock` exactly matches this checkpoint (SHA-256 `e79d1b12dd35b5e2bf8022ecae881aa16336d4a05b3613dd809a799e813bc9f7`). Dependencies are excluded from the output archive.
- Verification scope: focused Web tests and the API-client suite above, not the full monorepo tests/build/lint or live backend/WebSocket validation. Historical counts below describe earlier checkpoints.
- Stop point: package this Web checkpoint and report it. Do not start Waiter in this task.

## Status legend

- `PENDING` — not started.
- `IN_PROGRESS` — implementation or verification is underway.
- `BLOCKED` — cannot proceed because of an external dependency or prerequisite.
- `COMPLETED` — implemented and verified.

## Program state

- Overall status: `IN_PROGRESS`
- Baseline: `servora-topnav-responsive-improved-tanstack-plan (1).zip`
- Implementation policy: fresh implementation from this baseline; prior unverified TanStack Query code changes are not carried forward.
- Realtime/WebSocket assumption: **UNVERIFIED**. Do not rely on realtime for cache correctness or polling reduction.

## Architecture decisions

| Decision                                                                              | Status    | Notes                                                |
| ------------------------------------------------------------------------------------- | --------- | ---------------------------------------------------- |
| TanStack Query owns server/API state                                                  | COMPLETED | Architectural decision approved.                     |
| Zustand owns persistent client/auth/context state                                     | COMPLETED | Architectural decision approved.                     |
| React local state owns component/UI state                                             | COMPLETED | Architectural decision approved.                     |
| Standard feature structure uses `api/`, `query/`, `hooks/`, `components/`, `pages/`   | COMPLETED | Mandatory target structure.                          |
| Query keys must encode franchise/branch/session context when API results depend on it | COMPLETED | Mandatory cache-isolation rule.                      |
| Realtime is not a correctness dependency until separately verified                    | COMPLETED | Polling/refetch/invalidation must remain sufficient. |

## Milestone tracker

| Milestone | Scope                                                                                    | Status      |
| --------- | ---------------------------------------------------------------------------------------- | ----------- |
| A         | Correctness: architecture baseline, inventory, cache isolation, canonical keys           | PENDING     |
| B         | Feature architecture and mutation ownership                                              | IN_PROGRESS |
| C         | Runtime resilience: freshness, polling, retries, guards, cancellation, session lifecycle | IN_PROGRESS |
| D         | Diagnostics, optimizations, tests, cross-app rollout, final audit                        | PENDING     |

## Phase tracker

|   # | Phase                                                  | Status      | Verification / notes                                                                                                                                                                                                                             |
| --: | ------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|   1 | Architecture baseline and conventions                  | PENDING     | Create shared query context/policies and apply documented conventions.                                                                                                                                                                           |
|   2 | Full query/mutation inventory and scope classification | PENDING     | Inventory all apps and classify global/org/franchise/branch/session scope.                                                                                                                                                                       |
|   3 | Multi-tenant cache-isolation remediation               | PENDING     | Branch/franchise/session-dependent queries require explicit cache identity.                                                                                                                                                                      |
|   4 | Canonical query-key factories                          | IN_PROGRESS | Web, Waiter, Kitchen, and Customer use contextual canonical keys for their audited scope. Final cross-app review remains.                                                                                                                        |
|   5 | Feature query architecture                             | IN_PROGRESS | Web P0 ownership and the Waiter, Kitchen, and Customer structural rollouts are complete. Final cross-app ownership audit remains.                                                                                                                |
|   6 | Mutation invalidation graph                            | IN_PROGRESS | Tables, core Web Orders, Combos, Kitchen Stations, Variant Availability, Promotions, Menu Schedules, Loyalty, Customer Groups, Price Rules, and Menu Memberships now invalidate current-context resource families instead of broad/global roots. |
|   7 | QueryClient usage cleanup                              | IN_PROGRESS | Audited Web, Waiter, Kitchen, and Customer React consumers use `useQueryClient()`; singleton imports remain only in bootstrap/non-React infrastructure. Final audit remains.                                                                     |
|   8 | Freshness/polling/focus/reconnect policy               | IN_PROGRESS | All four apps preserve their audited polling/refetch behavior and do not require realtime for correctness. Final cross-app review remains.                                                                                                       |
|   9 | Retry and error policy                                 | IN_PROGRESS | Web queries inherit the shared `isRetryableApiError` bounded retry policy; Differentiators no longer disables safe transient retries. Cross-app review remains.                                                                                  |
|  10 | Query dependency guards                                | IN_PROGRESS | Web required-ID queries now guard Orders/Billing/Takeaway QR/Settings and Menu detail subqueries against empty prerequisites. Final Web/cross-app sweep remains.                                                                                 |
|  11 | Request cancellation                                   | IN_PROGRESS | Eligible audited reads in Web, Waiter, Kitchen, and Customer propagate `AbortSignal` through supported GET configuration. Final audit remains.                                                                                                   |
|  12 | Pagination consistency                                 | IN_PROGRESS | Web Staff/Inventory and Waiter Orders retain previous pages while fetching. Customer and Kitchen have no audited paginated list requiring this policy. Final audit remains.                                                                      |
|  13 | Derived data / `select` cleanup                        | PENDING     | Remove repeated presentation-independent transformations.                                                                                                                                                                                        |
|  14 | Auth/session cache lifecycle                           | IN_PROGRESS | Web, Waiter, Kitchen, and Customer cancel active contextual queries before clearing/replacing identity state and remount contextual UI where required. Final audit remains.                                                                      |
|  15 | Loading/background-state semantics                     | IN_PROGRESS | Audited loading/background-fetch behavior is verified in all four apps. Final consistency audit remains.                                                                                                                                         |
|  16 | Duplicate remote-state ownership cleanup               | IN_PROGRESS | Web P0 plus Waiter, Kitchen, and Customer ownership cleanup is complete for their audited scopes. Final audit remains.                                                                                                                           |
|  17 | Devtools and diagnostics                               | PENDING     | Development-only diagnostics.                                                                                                                                                                                                                    |
|  18 | Selective prefetching                                  | PENDING     | Only after correctness work.                                                                                                                                                                                                                     |
|  19 | Selective optimistic updates                           | PENDING     | Only for safe/reversible operations.                                                                                                                                                                                                             |
|  20 | Cache-contract and regression tests                    | IN_PROGRESS | Latest root verification passes 726 files / 2,959 tests, 15/15 typecheck workspaces, and root lint. Final audit remains.                                                                                                                         |
|  21 | Cross-app standardization                              | COMPLETED   | Web, Waiter, Kitchen, and Customer implementation slices are complete for their verified scopes.                                                                                                                                                 |
|  22 | Final audit and repository quality gates               | PENDING     | Typecheck, lint, test, build, final independent audit.                                                                                                                                                                                           |

## Latest implementation checkpoint — Web Tables

- Status: `IN_PROGRESS`
- Completed in this checkpoint:
  - moved merge mutation/cache policy from `MergeTableDialog` into `useMergeOrders`;
  - replaced literal `["orders"]` merge invalidation with current-context order list/detail and table-list invalidation;
  - moved takeaway QR GET/regenerate transport and remote state out of `TablesPage`/`useTablesPageState`;
  - added branch-scoped `tableKeys.takeawayQr(branchId)` and reusable query options/hook;
  - added `useRegenerateTakeawayQr` with direct QR cache update;
  - narrowed table CRUD/status/table-QR and transfer invalidations from `*.all` to current-context families;
  - added regression tests for merge, transfer, takeaway-QR mutation, keys/options, and page orchestration.
- Verification: `7` focused test files / `16` tests passing.
- Full Web typecheck: test-only callback inference issues were fixed; the subsequent full app run exceeded the execution window and remains pending before Tables can be marked fully completed.
- Existing test-suite warnings about React `act(...)` and mocked `loading` DOM props remain outside this remediation slice; tests pass.

## Latest implementation checkpoint — Web Orders + active menus

- Status: `IN_PROGRESS`
- Completed in this checkpoint:
  - narrowed `useCreateOrder` invalidation to current-context order lists and table list;
  - narrowed order status/item mutations from `orderKeys.all` / `tableKeys.all` to current-context list/detail families;
  - retained specific order-detail invalidation where the mutation changes one order;
  - added regression coverage for create/status/add-item/comp/void/refire invalidation policy;
  - centralized active-menu cache identity under `menuKeys.activeMenus(orderType)` with branch context;
  - added `activeMenusQuery` and `useActiveMenus`;
  - removed direct active-menu `useQuery` + `createMenuApi` ownership from `CreateOrderModal` and `MenusSection`;
  - both consumers now share the same Menu-feature query/cache contract.
- Verification:
  - Orders invalidation slice: `4` test files / `10` tests passing;
  - active-menu slice: `5` test files / `15` tests passing;
  - Web `tsc --noEmit`: passing.

## Latest implementation checkpoint — Web Menu P0 expansion

- Status: `IN_PROGRESS`
- Completed in this checkpoint:
  - added branch-scoped canonical keys for Combos, Kitchen Stations, item station routes, Promotions, and Promotion Stats;
  - added reusable query definitions for those resources;
  - moved Combo transport/cache policy from `CombosSection` into `menuCombosService` + query/mutation hooks;
  - moved Kitchen Station literal query keys/invalidation into canonical Menu keys/query options;
  - moved Variant Availability/stock mutation transport and invalidation out of `VariantAvailabilityPanel`;
  - narrowed variant availability/stock refresh to branch-scoped Menu Categories instead of broad `["menu"]`;
  - moved Promotion list/stats transport and mutation invalidation out of `PromotionsSection` / `PromotionList` into feature-owned service/hooks;
  - preserved component-owned form validation, toasts, edit/reset state, and user interaction behavior.
- Verification:
  - focused Menu regression suite: `7` test files / `21` tests passing;
  - Web `tsc --noEmit`: passing.

## Latest implementation checkpoint — Web Menu pricing/availability ownership

- Status: `IN_PROGRESS`
- Completed in this checkpoint:
  - moved Happy Hour creation transport out of `HappyHourSection` into `menuPricingService` + `useCreateHappyHourRule`;
  - added branch-scoped canonical key/query ownership for Buffet / per-cover price rules;
  - moved per-cover price-rule mutations and invalidation out of `BuffetPricingSection`;
  - added item-specific, branch-scoped canonical Channel Override keys/query ownership;
  - moved channel override save/delete transport and invalidation out of `ChannelOverridesPanel`;
  - moved Variant Modifier Pricing mutation transport/cache policy out of `VariantModifierPricingPanel` into a feature hook backed by `modifierGroupsService`;
  - replaced literal/ad-hoc invalidation in these areas with `menuKeys.perCoverPriceRules()`, `menuKeys.channelOverrides(itemId)`, and `menuKeys.modifierGroups()`;
  - preserved component-local form state, validation, success/error presentation, and payload shaping behavior.
- Verification:
  - focused Menu regression suite: `7` test files / `20` tests passing;
  - direct API/query-key/invalidation ownership scan for the four migrated components: clean;
  - full Web `tsc --noEmit` was retried after fixing one test-only callback typing issue but exceeded the execution window before completion, so the full typecheck gate remains pending for this checkpoint.

## Latest implementation checkpoint — Web Menu schedules, loyalty, groups, rules, memberships

- Status: `IN_PROGRESS`
- Completed in this checkpoint:
  - moved Menu Schedule list/create/remove transport and cache policy out of `MenuScheduleEditor` into `menuSchedulesService` plus feature hooks;
  - added canonical franchise-scoped `menuKeys.menuSchedules(menuId)` identity;
  - centralized Loyalty tiers/customers and Customer Groups under a shared Menu loyalty service and branch-scoped keys;
  - moved loyalty/customer/group mutations and invalidation out of `LoyaltySection` and `CustomerGroupsSection`;
  - added canonical branch-scoped `menuKeys.itemPriceRules(itemId)` and moved item Price Rule query/mutation policy out of `PriceRulesPanel`;
  - reused the canonical Customer Groups query inside Price Rules instead of duplicating a literal key;
  - moved Menu Membership assignment/removal transport and cache policy out of `MenuMembershipsEditor` into `useUpdateMenuMembership`;
  - preserved component-local form/draft/selection state and existing UI behavior.
- Verification:
  - focused Menu regression suite: `7` test files / `16` tests passing;
  - migrated-component ownership scan: no direct API construction, `useQuery`/`useMutation`, literal query keys, or invalidation graphs remain in the five migrated components;
  - Web `tsc --noEmit`: passing.

## Latest implementation checkpoint — Web Menu ownership completion

- Status: `COMPLETED` for component-owned server-state/cache-policy cleanup within the audited Web Menu feature.
- Completed in this checkpoint:
  - moved Organization Management organization/tenant/menu/price-rule/loyalty queries and mutations behind a dedicated service + feature hook layer;
  - added canonical organization-default query keys under the Menu namespace;
  - moved Sub-recipe create/delete mutation and invalidation policy into `useSubRecipes`;
  - added canonical branch-scoped `menuKeys.subRecipes()`;
  - preserved component-local form, selection, validation, stale-data, and error-presentation behavior.
- Verification:
  - focused regression suite: `3` test files / `9` tests passing;
  - final Web Menu component ownership scan: no direct API construction, `useQuery`, `useMutation`, `useQueryClient`, direct invalidation, or literal server-state query keys remain outside feature hooks/services;
  - Web `tsc --noEmit`: passing.
- Remaining work is no longer Web Menu component ownership; continue the same canonical key/query/mutation architecture through remaining Web domains, then Waiter, Kitchen, and Customer.

## Domain rollout tracker

### Web

| Domain                                              | Keys      | Queries     | Mutations   | Hooks structure | Tenant/branch isolation | Tests       | Status      |
| --------------------------------------------------- | --------- | ----------- | ----------- | --------------- | ----------------------- | ----------- | ----------- |
| Orders                                              | COMPLETED | IN_PROGRESS | COMPLETED   | IN_PROGRESS     | COMPLETED               | COMPLETED   | IN_PROGRESS |
| Menu / active menu                                  | COMPLETED | COMPLETED   | COMPLETED   | IN_PROGRESS     | COMPLETED               | COMPLETED   | IN_PROGRESS |
| Inventory / transactions                            | COMPLETED | IN_PROGRESS | IN_PROGRESS | IN_PROGRESS     | COMPLETED               | IN_PROGRESS | IN_PROGRESS |
| Tables                                              | COMPLETED | COMPLETED   | IN_PROGRESS | IN_PROGRESS     | COMPLETED               | COMPLETED   | IN_PROGRESS |
| Staff / roles                                       | COMPLETED | COMPLETED   | COMPLETED   | IN_PROGRESS     | COMPLETED               | COMPLETED   | IN_PROGRESS |
| Settings / approval thresholds                      | COMPLETED | COMPLETED   | COMPLETED   | IN_PROGRESS     | COMPLETED               | COMPLETED   | IN_PROGRESS |
| Operations / branch health                          | COMPLETED | COMPLETED   | N/A         | IN_PROGRESS     | COMPLETED               | COMPLETED   | IN_PROGRESS |
| Audit                                               | COMPLETED | COMPLETED   | N/A         | COMPLETED       | COMPLETED               | COMPLETED   | IN_PROGRESS |
| Kitchen stations                                    | COMPLETED | COMPLETED   | COMPLETED   | IN_PROGRESS     | COMPLETED               | IN_PROGRESS | IN_PROGRESS |
| Approvals                                           | PENDING   | PENDING     | IN_PROGRESS | IN_PROGRESS     | PENDING                 | COMPLETED   | IN_PROGRESS |
| Customer groups                                     | COMPLETED | COMPLETED   | COMPLETED   | IN_PROGRESS     | COMPLETED               | COMPLETED   | IN_PROGRESS |
| Loyalty                                             | COMPLETED | COMPLETED   | COMPLETED   | IN_PROGRESS     | COMPLETED               | COMPLETED   | IN_PROGRESS |
| Billing                                             | COMPLETED | COMPLETED   | COMPLETED   | IN_PROGRESS     | COMPLETED               | COMPLETED   | IN_PROGRESS |
| Analytics                                           | COMPLETED | COMPLETED   | N/A         | IN_PROGRESS     | COMPLETED               | COMPLETED   | IN_PROGRESS |
| Promotions / price rules / schedules / availability | COMPLETED | COMPLETED   | IN_PROGRESS | IN_PROGRESS     | COMPLETED               | COMPLETED   | IN_PROGRESS |
| Business                                            | COMPLETED | COMPLETED   | COMPLETED   | COMPLETED       | COMPLETED               | COMPLETED   | IN_PROGRESS |
| Differentiators                                     | COMPLETED | COMPLETED   | COMPLETED   | COMPLETED       | COMPLETED               | COMPLETED   | IN_PROGRESS |
| Remaining Web domains                               | COMPLETED | COMPLETED   | COMPLETED   | COMPLETED       | COMPLETED               | IN_PROGRESS | IN_PROGRESS |

## Latest implementation checkpoint — Web Availability + Analytics + Operations ownership cleanup

- Status: `IN_PROGRESS` for the full Web rollout; this checkpoint removes the remaining page-owned server-state policy from Availability, Menu Engineering analytics, and Operations/Branch Health.
- Availability completed in this checkpoint:
  - added branch-scoped `availabilityKeys.dashboard(channel, fulfillmentType, cause)`;
  - added reusable dashboard query options and `useAvailabilityDashboard`;
  - moved direct `createAvailabilityApi` ownership out of `AvailabilityDashboardPage`;
  - preserved filter-driven refetch, manual refresh, realtime-triggered refetch, local search/grouping, and API-error rendering.
- Analytics completed in this checkpoint:
  - added branch-scoped `analyticsKeys.menuEngineering(windowDays)`;
  - added typed `analyticsService.menuEngineering`, reusable query options, and `useMenuEngineering`;
  - preserved explicit Apply semantics by separating selected vs applied analysis window;
  - narrowed dashboard realtime order invalidation from global `orderKeys.all` to current-context `orderKeys.lists()`.
- Operations completed in this checkpoint:
  - added branch-scoped `operationsKeys.snapshot()` and reusable snapshot query options/hook;
  - both Operations Center and Branch Health now share the same canonical snapshot cache instead of separate literal keys for identical server data.
- Verification:
  - focused regression suite: `3` test files / `6` tests passing;
  - Web `tsc --noEmit`: passing;
  - static scan confirms page-level API construction/literal operation keys are removed from these three migrated areas.
- Next Web ownership targets: Settings, Business, Staff/Roles, and remaining lower-priority pages before cross-app rollout.

## Latest implementation checkpoint — Web Orders + Billing ownership cleanup

- Status: `IN_PROGRESS` for the full Web rollout; this checkpoint completes the audited Orders component-ownership leaks and the primary Billing server-state ownership/invalidation slice.
- Orders completed in this checkpoint:
  - moved order explain loading from component-local effect/API ownership to `orderKeys.explanation(orderId)`, reusable query options, and `useOrderExplanation`;
  - moved manager approval transport into an Orders approval service + `useRequestManagerApproval`;
  - routed seat-share mutation through `ordersService` instead of constructing an Orders API inside the hook;
  - final Orders component/page scan: no direct API construction, `useQuery`, `useMutation`, `useQueryClient`, direct invalidation, or literal query keys remain in audited Orders components/pages.
- Billing completed in this checkpoint:
  - added branch-scoped `billingKeys.order(orderId)` and reusable order-bills query/hook;
  - moved payment/print dialogs off ad-hoc literal billing keys;
  - moved even/item/seat split mutation ownership out of `SplitBillDialog` into Billing hooks;
  - narrowed payment success synchronization to the exact billing order, current order detail/list families, and current table list instead of global Orders/Tables roots;
  - typed the Billing service boundary as `Promise<Bill[]>`, removing component-level type masking.
- Verification:
  - focused Orders + Billing regression suite: `7` test files / `20` tests passing;
  - earlier focused Orders ownership suite: `6` test files / `12` tests passing;
  - Web `tsc --noEmit`: passing;
  - Orders/Tables/Inventory audited component/page ownership scans are clean.
- Remaining Web ownership hotspots found by the full scan: Settings cards/page, Analytics `MenuEngineeringPage`, Availability dashboard, and Operations pages; these are the next Web P0/P1 targets before cross-app rollout.

## Latest implementation checkpoint — Web Inventory transaction key cleanup

- Status: `IN_PROGRESS` for the full Inventory domain; canonical transaction/waste cache identity is completed and verified.
- Completed in this checkpoint:
  - added branch-scoped `inventoryKeys.transactions()` and `inventoryKeys.wasteReasons()`;
  - removed literal global `['inventory', 'transactions']` usage from Inventory queries/mutations;
  - removed the standalone waste-reason literal key and routed waste-reason query/invalidation through the canonical key factory;
  - updated stock/waste mutations to invalidate only current-branch Inventory item/transaction/reason caches.
- Verification:
  - focused Inventory regression suite: `4` test files / `9` tests passing;
  - Inventory component/page ownership scan: no direct API construction, component-owned query/mutation policy, or direct invalidation detected;
  - Web `tsc --noEmit`: passing.

### Other apps

| App      | Inventory | Key standardization | Polling/refetch policy | Mutation invalidation | Session/context isolation | Tests | Status    |
| -------- | --------- | ------------------- | ---------------------- | --------------------- | ------------------------- | ----- | --------- |
| Waiter   | COMPLETED | COMPLETED           | COMPLETED              | COMPLETED             | COMPLETED                 | PASS  | COMPLETED |
| Kitchen  | COMPLETED | COMPLETED           | COMPLETED              | COMPLETED             | COMPLETED                 | PASS  | COMPLETED |
| Customer | N/A       | COMPLETED           | COMPLETED              | N/A                   | COMPLETED                 | PASS  | COMPLETED |

## Known audit findings to remediate

| Finding                                                                             | Priority | Status      |
| ----------------------------------------------------------------------------------- | -------- | ----------- |
| Branch/franchise-dependent queries use cache keys that do not always encode context | P0       | PENDING     |
| `menu` and `menus` cache namespaces coexist                                         | P0       | PENDING     |
| Branch switching relies on inconsistent cache behavior for unscoped queries         | P0       | PENDING     |
| Literal/ad-hoc query keys remain in feature code                                    | P1       | IN_PROGRESS |
| Broad/global invalidation remains to be checked by the final cross-app review       | P1       | IN_PROGRESS |
| Query/mutation/cache policy is still owned by some pages/components                 | P1       | IN_PROGRESS |
| Direct global QueryClient imports exist inside React code                           | P1       | PENDING     |
| Freshness and polling policy is inconsistent across apps/domains                    | P1       | PENDING     |
| Realtime code exists but has not been independently verified                        | P1       | PENDING     |
| Query guards/cancellation are not consistently standardized                         | P2       | PENDING     |
| Auth/session cache lifecycle needs explicit verification                            | P2       | PENDING     |
| Pagination/derived-data/loading semantics need consistency audit                    | P2       | PENDING     |
| Prefetching/optimistic updates are optional later optimizations                     | P3       | PENDING     |

## Cache-isolation acceptance tests

All must pass before Milestone A can be completed:

- [ ] Branch A query cache cannot satisfy equivalent Branch B queries.
- [ ] Franchise switch cannot reuse previous franchise branch-specific data.
- [ ] User logout/login cannot expose previous user's server state.
- [ ] Rapid branch switching cannot surface stale previous-context data.
- [ ] Active menu cache uses one canonical namespace.
- [ ] Mutation invalidation targets only the current context unless cross-context behavior is explicitly intended.

## Architecture acceptance checklist

For each migrated domain:

- [ ] API calls live under `api/`.
- [ ] Canonical keys live under `query/*.keys.ts`.
- [ ] Reusable query definitions live under `query/*.queries.ts`.
- [ ] Mutation/cache synchronization lives under `query/*.mutations.ts`.
- [ ] React integration lives in thin hooks under `hooks/`.
- [ ] Pages/components do not invent cache keys.
- [ ] Pages/components do not own invalidation graphs.
- [ ] Context-sensitive keys include explicit context.
- [ ] Broad invalidation is absent unless documented.
- [ ] Existing behavior is preserved except where cache behavior was incorrect.

## Runtime acceptance checklist

- [x] Web dashboard polling remains active without depending on WebSocket delivery; cross-app verification remains.
- [x] Web dashboard/operations polling intervals now use shared documented policy constants; cross-app rollout remains.
- [x] Web uses disabled focus refetch and explicit reconnect refetch; other apps remain to audit.
- [x] Web uses the shared retryability classifier rather than unconditional retry loops; cross-app verification remains.
- [x] Web mutation default remains `retry: false`.
- [x] Audited Web operational query functions propagate cancellation through supported GET configuration; cross-app rollout remains.
- [x] Web required-ID query definitions now include guards for the audited detail/dependent resources; final cross-app sweep remains.
- [x] Audited Web loading semantics preserve usable data during background fetching; Staff/Inventory pagination verified with runtime tests. Cross-app audit remains.

## Quality gates

Before final completion:

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Tests pass.
- [ ] Build passes.
- [ ] TanStack Query regression tests pass.
- [ ] Final independent query-key/invalidation/cache-isolation audit passes.
- [ ] This tracker reflects the actual source state.

## Latest implementation checkpoint — Web runtime policy foundation

- Status: `IN_PROGRESS` for runtime resilience.
- Completed in this checkpoint:
  - added shared Web freshness classes (`nearLive`, `operational`, `transactional`, `normal`, `semiStatic`, `reference`) and polling constants;
  - made reconnect refetch explicit while retaining disabled window-focus refetch;
  - preserved dashboard polling even when realtime reports connected, so WebSocket delivery is not required for correctness;
  - normalized operational freshness for Orders, Tables, Inventory, Availability, Analytics, Operations, Staff, Branches, Menu reference data, and Differentiators;
  - removed Differentiators-specific `retry: false` / `refetchOnMount: false` exceptions so it inherits the shared retry/error contract;
  - added required-ID guards to Orders, Billing, Takeaway QR, Settings, and Menu detail/dependent queries;
  - keyed the routed dashboard subtree by membership/branch context so feature hooks recompute contextual cache identity immediately after context switches;
  - replaced realtime literal root invalidations with canonical current-context Menu/Analytics/Inventory keys.
- Verification:
  - runtime/query-policy regression suite: `6` files / `20` tests passing;
  - Web `tsc --noEmit`: passing.
- Historical remaining work at this foundation checkpoint: Web singleton cleanup, cancellation, pagination/loading and lifecycle verification. The verified Web closeout above supersedes these Web items; cross-app rollout remains.

## Next implementation step

Web, Waiter, Kitchen, and Customer are verified for their documented implementation scopes. Package and report the Customer checkpoint, then run the final cross-app query-key, invalidation, cache-isolation, structure, lifecycle, and quality-gate audit.

## Latest implementation checkpoint — Web Settings + Staff/Roles ownership cleanup

- Status: `IN_PROGRESS` for the full Web rollout; this checkpoint completes the audited component/page ownership cleanup for Settings and Staff/Roles.
- Settings completed in this checkpoint:
  - added canonical `settingsKeys.tenant(tenantId)` and franchise-scoped approval-threshold keys;
  - added shared settings and approval-threshold services, reusable query options, and thin query/mutation hooks;
  - moved pricing, kitchen-operations, approval-threshold, and cancellation-reason mutation/query ownership out of Settings pages/components;
  - Settings pages/components no longer construct APIs, call `useQuery`/`useMutation`/`useQueryClient`, invent literal server-state keys, or own invalidation graphs.
- Staff/Roles completed in this checkpoint:
  - moved staff update ownership into `useUpdateStaff`;
  - added contextual role-permission keys and reusable permission query options;
  - moved role create/archive/permission-save/query policy into feature hooks;
  - Staff page and RoleManager no longer own TanStack cache policy or literal permission keys.
- Verification:
  - Settings focused suite: `4` files / `8` tests passing;
  - Staff/Roles focused suite: `4` files / `11` tests passing;
  - combined focused verification: `8` files / `19` tests passing;
  - Web `tsc --noEmit`: passing.
- Next Web P0 ownership target: Business page and Organization/Franchise/Branch modals, followed by final Web ownership/runtime-policy scan before Waiter, Kitchen, and Customer.

## Latest implementation checkpoint — Web P0 ownership/cache-identity completion

- Status: `COMPLETED` for Web P0 feature page/component ownership and canonical cache identity; the overall TanStack remediation plan remains `IN_PROGRESS`.
- Business completed:
  - added account/business-wide `businessKeys.hierarchy()` and reusable hierarchy query options/hook;
  - moved Organization/Franchise/Branch save/archive mutations behind Business feature hooks;
  - moved membership/context refresh + Business hierarchy invalidation behind `useRefreshBusiness`;
  - retained form/modal state and validation UX in components.
- Differentiators completed:
  - added branch-contextual menu-choice, availability, and engineering keys;
  - centralized Menu/Availability/Analytics/Orders/Approvals transport in the Differentiators service;
  - moved query/mutation ownership out of Differentiators page/panels;
  - Guided Builder keeps local workflow state while transport lives in the feature service.
- Audit completed:
  - added branch-contextual audit list/menu-history keys;
  - moved both infinite-query policies into Audit feature hooks.
- Final cache-contract cleanup:
  - tenant-scoped cancellation reasons now include franchise context in key identity and invalidation;
  - Inventory low-stock uses a canonical `inventoryKeys.lowStock()` factory;
  - Orders course sequencing reuses the canonical Settings tenant query instead of owning a duplicate tenant-settings query.
- Final Web P0 static scans:
  - no direct `useQuery`, `useInfiniteQuery`, `useMutation`, `useQueryClient`, API-constructor, direct invalidation, or literal `queryKey: [...]` ownership remains in non-test Web feature pages/components;
  - no broad `.all` or literal-array invalidation candidates remain in audited Web feature source;
  - no literal `queryKey: [...]` candidates remain in audited Web feature source.
- Verification:
  - Business: `1` file / `7` tests passing;
  - Differentiators: `1` file / `6` tests passing;
  - Audit: `1` file / `4` tests passing;
  - final cache-contract closeout suite: `5` files / `25` tests passing;
  - Web `tsc --noEmit`: passing.
- Remaining Web work is runtime policy/audit, not P0 component ownership. Realtime/WebSocket remains unverified and must not be relied on for correctness or polling reduction.
