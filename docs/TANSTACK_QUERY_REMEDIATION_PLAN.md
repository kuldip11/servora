# Servora TanStack Query Remediation Plan

## Purpose

This plan standardizes Servora's TanStack Query implementation into a production-ready server-state architecture that is tenant-safe, branch-safe, scalable, testable, and easy for future developers to understand.

Realtime/WebSocket behavior is currently **unverified** and must not be relied on for correctness. Until separately tested and approved, correctness must come from query identity, polling where required, mutation-driven cache synchronization, reconnect/refetch behavior, and explicit invalidation.

## Architectural ownership

Servora will use the following state boundaries:

- **TanStack Query** — remote/server state from the Servora API.
- **Zustand** — authenticated client context such as selected franchise/branch and other persistent application state.
- **React local state** — temporary UI/component state such as dialogs, tabs, draft controls, and presentation-only state.

Remote API data must not be duplicated in Zustand or ad-hoc `useEffect`/`fetch` state unless a documented exception exists.

## Required feature structure

Every feature that owns TanStack Query state should converge on this structure:

```text
features/
  orders/
    api/
      orders.api.ts
    query/
      orders.keys.ts
      orders.queries.ts
      orders.mutations.ts
    hooks/
      useOrders.ts
      useOrder.ts
      useUpdateOrder.ts
    components/
    pages/
```

Responsibilities:

- `api/*.api.ts` — HTTP/API calls only. No React hooks, cache keys, UI logic, or invalidation policy.
- `query/*.keys.ts` — canonical cache-key hierarchy and cache identity.
- `query/*.queries.ts` — reusable `queryOptions()` / infinite-query definitions and server-state configuration.
- `query/*.mutations.ts` — reusable mutation definitions plus authoritative cache updates/invalidation policy.
- `hooks/*.ts` — React integration that binds app context to query/mutation definitions.
- `components/` — presentation and feature UI.
- `pages/` — orchestration only; pages should not invent query keys or cache topology.

Shared TanStack infrastructure belongs outside feature folders, for example:

```text
shared/
  query/
    query-client.ts
    query-context.ts
    query-policies.ts
    query-errors.ts
```

## Core design rules

### 1. Explicit tenant/franchise/branch cache identity

Any API response that changes according to organization/franchise/branch/session context must encode the same identity in its query key.

Bad:

```ts
["operations", "snapshot"];
```

Preferred:

```ts
operationsKeys.snapshot({ franchiseId, branchId });
```

The API's request headers are not visible to TanStack Query. Hidden headers alone must never define cache identity.

### 2. Canonical key factories only

Production feature code should not invent ad-hoc literal query keys. Each domain owns one canonical hierarchical key factory.

Examples:

```text
orderKeys
menuKeys
inventoryKeys
tableKeys
staffKeys
operationsKeys
auditKeys
billingKeys
loyaltyKeys
approvalKeys
customerGroupKeys
kitchenStationKeys
analyticsKeys
```

The confirmed `menu` / `menus` namespace split must be eliminated.

### 3. Components do not own cache strategy

Pages/components should consume hooks such as:

```ts
useOrders();
useOrder();
useUpdateOrder();
```

They should not decide which caches are invalidated or updated after a mutation.

### 4. Query context is explicit

Feature hooks should derive branch/franchise context and pass it explicitly to key/query definitions. Key factories must not hide critical dependencies through `store.getState()` where doing so would prevent React dependency changes from being visible.

### 5. Targeted invalidation

Bare calls such as:

```ts
queryClient.invalidateQueries();
```

are not acceptable in production feature code unless a documented global-reset case exists.

Each mutation must define the smallest correct affected cache surface.

### 6. Prefer authoritative mutation responses

If the API returns the authoritative updated entity, update detail caches directly with `setQueryData()` where safe, then invalidate only related collection queries.

Do not introduce client-side pricing, availability, or other business-authoritative calculations.

### 7. Realtime is not a correctness dependency

Until WebSocket/realtime has been independently tested:

- do not reduce required polling because a socket exists;
- do not classify realtime cache updates as a correctness guarantee;
- do not rely on socket delivery for order/table/kitchen synchronization;
- keep polling/refetch/invalidation policies sufficient without realtime.

## Remediation phases

### Phase 1 — Architecture baseline and conventions

- Establish this document as the TanStack Query architecture standard.
- Add the status tracker and maintain it during every implementation slice.
- Define shared query context types/utilities.
- Define shared query policy constants for stale/freshness classes.
- Confirm production code has one QueryClient per app/provider boundary as intended.

### Phase 2 — Full query inventory and context classification

Inventory every production use of:

- `useQuery`
- `useInfiniteQuery`
- `useMutation`
- `queryOptions`
- `infiniteQueryOptions`
- `fetchQuery`
- `prefetchQuery`
- `ensureQueryData`
- `setQueryData` / `setQueriesData`
- `invalidateQueries`
- `removeQueries`
- direct `queryClient` imports

Classify each resource as:

- global/reference;
- organization-scoped;
- franchise-scoped;
- branch-scoped;
- authenticated-user/session-scoped.

### Phase 3 — Multi-tenant cache-isolation remediation

Convert every context-sensitive query key to explicit context-aware identity.

Priority domains include:

- orders;
- menu and active menu;
- inventory and transactions;
- tables;
- staff/roles;
- audit;
- operations/branch health;
- kitchen stations;
- approvals;
- customer groups;
- loyalty;
- billing;
- analytics;
- schedules;
- promotions;
- price rules;
- availability.

Acceptance criteria:

- Branch A cache cannot satisfy Branch B query observers.
- Franchise switching cannot reuse branch-specific cached data.
- Rapid context changes cannot surface previous-context data.

### Phase 4 — Canonical key factories

- Introduce one `*.keys.ts` per server-state domain.
- Remove duplicate/singular/plural key namespaces.
- Replace inline key arrays in production feature code.
- Preserve compatibility re-exports temporarily when necessary to avoid a large-bang migration.

### Phase 5 — Feature query architecture

For each feature:

- create/standardize `api/`;
- create `query/*.keys.ts`;
- create `query/*.queries.ts`;
- create `query/*.mutations.ts`;
- create thin React hooks in `hooks/`;
- migrate page/component ownership out of JSX.

Suggested rollout order:

1. Orders
2. Menu
3. Inventory
4. Tables
5. Staff / roles
6. Operations
7. Audit
8. Billing / approvals / loyalty / customer groups
9. Analytics and remaining Web domains
10. Waiter
11. Kitchen
12. Customer

### Phase 6 — Mutation invalidation graph

For every mutation:

- identify authoritative returned data;
- identify affected detail caches;
- identify affected list/summary caches;
- remove unrelated invalidations;
- replace global invalidations with targeted invalidation;
- ensure context-specific invalidation uses the same context as the mutation.

### Phase 7 — QueryClient usage cleanup

Inside React hooks/components:

```ts
const queryClient = useQueryClient();
```

should be preferred over importing a singleton.

Direct QueryClient imports may remain only in infrastructure that cannot use React hooks, such as auth/bootstrap/network boundaries, and must be documented.

### Phase 8 — Freshness, polling, focus and reconnect policy

Define central freshness classes, for example:

- `nearLive`
- `operational`
- `normal`
- `semiStatic`
- `reference`

Explicitly review:

- `staleTime`;
- `gcTime`;
- `refetchInterval`;
- `refetchOnMount`;
- `refetchOnWindowFocus`;
- `refetchOnReconnect`.

Polling remains the reliable synchronization mechanism where needed until realtime is verified.

### Phase 9 — Retry and error policy

Standardize query retry behavior:

- validation/business errors — no retry;
- 401/403 — no normal retry loop;
- non-idempotent mutations — no automatic retry unless specifically safe;
- transient network/5xx errors — bounded retry according to shared policy.

Align TanStack Query failures with the existing Servora UI error-handling contract.

### Phase 10 — Query dependency guards

Audit all conditional queries and add intentional `enabled` conditions for required identifiers/context such as:

- franchise ID;
- branch ID;
- order ID;
- menu ID;
- customer/session token;
- prerequisite query data.

Queries must not issue malformed or contextless requests during initialization/context transitions.

### Phase 11 — Request cancellation

Where supported by the API client, propagate TanStack Query's `AbortSignal` through query functions.

Prioritize:

- branch/franchise switching;
- pagination;
- search/filter changes;
- route changes;
- rapidly changing detail selections.

### Phase 12 — Pagination consistency

Standardize paginated keys, for example:

```ts
orderKeys.list(context, { page, limit, filters, sort });
```

Use `placeholderData: keepPreviousData` where appropriate for page transitions.

Use `useInfiniteQuery` only for actual infinite-loading UX; do not manually accumulate pages in component state when TanStack Query can own them.

### Phase 13 — Derived data and `select`

Move repeated presentation-independent transformation from components into:

- API/domain mapping where business-normalization is needed; or
- query `select` where it is cache-consumer-specific.

Do not move server-authoritative pricing/availability logic into client selectors.

### Phase 14 — Auth/session cache lifecycle

Explicitly define cache behavior for:

- login;
- logout;
- refresh-token failure;
- user switch;
- tenant/franchise/branch switch.

Authenticated server state must never leak between users or tenant contexts in the same browser session.

### Phase 15 — Loading/background-state semantics

Standardize correct use of:

- `isPending`;
- `isFetching`;
- `isRefetching`;
- `isError`.

Avoid replacing usable cached data with full-page loaders during background refresh.

### Phase 16 — Eliminate duplicate remote-state ownership

Search for API resources simultaneously managed by TanStack Query and:

- `useEffect` + manual fetch;
- Zustand;
- duplicated local component state.

TanStack Query should be the primary owner of server state unless a documented exception exists.

### Phase 17 — Devtools and diagnostics

Enable TanStack Query Devtools in development only if not already available.

Use them to validate:

- cache identity;
- stale/fresh transitions;
- duplicate queries;
- observer counts;
- invalidation breadth;
- refetch loops.

### Phase 18 — Selective prefetching

Only after correctness and architecture remediation:

- order list → order detail;
- menu list → menu detail;
- other measurable high-value navigation paths.

Use shared `queryOptions()` definitions; avoid speculative large-data prefetches.

### Phase 19 — Selective optimistic updates

Optimization only, after cache correctness is proven.

Possible safe candidates:

- reversible availability/status toggles;
- simple table state transitions;
- carefully selected order status actions.

Avoid optimistic behavior for:

- payments;
- financial mutations;
- authoritative pricing calculations;
- complex order creation where server validation materially changes the result.

### Phase 20 — Architecture and regression tests

Add focused tests for Servora's cache contract:

- canonical key generation;
- branch/franchise isolation;
- session/user isolation;
- mutation invalidation scope;
- no unrelated invalidation;
- branch switching;
- logout/login cleanup;
- enabled guards;
- retry behavior;
- pagination key stability;
- mutation response cache updates;
- regression for `menu` vs `menus` namespace split.

### Phase 21 — Cross-app standardization

Apply the same architecture principles to Web, Waiter, Kitchen, and Customer while preserving app-specific freshness and polling needs.

Do not force identical runtime settings across apps when their operational requirements differ.

### Phase 22 — Final audit and release gates

Search for remaining:

- inline literal query keys;
- broad/global invalidations;
- duplicate namespaces;
- hidden context dependencies;
- direct singleton QueryClient usage in React;
- manual remote fetching that duplicates query ownership;
- arbitrary per-component stale/polling values;
- missing cancellation/guards where relevant.

Run repository quality gates:

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

Any failures caused by the remediation must be fixed before the program is marked complete.

## Milestones

### Milestone A — Correctness

- Phases 1–4 complete.
- Multi-tenant cache identity verified.
- Duplicate key namespaces removed.

### Milestone B — Maintainable feature architecture

- Phases 5–7 complete.
- Features follow `api/query/hooks/components/pages` structure.
- Mutations own their cache effects.

### Milestone C — Runtime resilience

- Phases 8–16 complete.
- Polling/refetch/retry/cancellation/session lifecycle are explicit and tested.

### Milestone D — Optimization and release readiness

- Phases 17–22 complete.
- Tests, diagnostics, selective optimizations, cross-app rollout, and final audit finished.

## Non-goals / guardrails

- Do not replace TanStack Query with Redux/Zustand for server state.
- Do not weaken authorization, validation, or tenant isolation.
- Do not duplicate server-side pricing or availability logic.
- Do not depend on unverified WebSocket behavior.
- Do not perform unrelated refactors while migrating a domain.
- Preserve public behavior and backward compatibility unless the remediation specifically fixes incorrect cache behavior.
