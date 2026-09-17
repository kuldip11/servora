# Frontend Engineering Standards

## Senior-level engineering goals

Servora's frontend should demonstrate measurable production engineering rather than feature count alone.

### Performance

- Track Core Web Vitals in deployed applications.
- Keep route-level code splitting for large feature pages.
- Enforce bundle budgets after production builds.
- Prefer cache-aware server state through TanStack Query over duplicate global stores.
- Profile expensive interactions before adding memoization.

### Accessibility

- Keyboard access is required for navigation and primary workflows.
- Dialogs and command/search experiences must manage focus correctly.
- Do not rely on color alone for operational state.
- Retain automated Axe coverage for critical paths.

### Authorization

- Hide or disable unauthorized UI to reduce confusion.
- Never treat frontend permission filtering as a security boundary.
- Server authorization remains authoritative.

### Explainability

When the backend makes a non-obvious decision, prefer rendering evidence over reproducing the decision logic on the client. Examples include pricing, availability, order transitions, and inventory deductions.

### Observability

`@pos/observability` is deliberately vendor-neutral. A hosted provider can be integrated by routing its event payloads to a backend/collector endpoint rather than coupling feature code to a monitoring SDK.

### Search and command navigation

The POS/admin app exposes a permission-aware Ctrl+K command palette. New major management surfaces should be added to the command registry when introduced.

## Operations UX

The owner web application exposes an Operations Center (`/operations`) and Branch Health (`/branch-health`). These views compose existing analytics, inventory, branch configuration and AvailabilityResolver data. They intentionally avoid synthetic device-health claims when Servora has no measured signal for that capability.

## Explainability

The Differentiators experience renders the existing immutable order-replay evidence as a human-readable pricing and availability trace. Pricing continues to be computed only by the server-authoritative pricing pipeline; the client is a presentation layer for recorded/replayed evidence.

## Offline and recovery UX

`@pos/ui` provides `ConnectivityBanner`, mounted in the Web, Waiter, Kitchen and Customer applications. Browser `offline`/`online` events provide immediate connectivity feedback and a short recovery state while normal query/realtime mechanisms resynchronize.

## Component documentation

`@pos/ui` includes Storybook configuration and initial component/overlay stories with the accessibility addon enabled. Run `bun run storybook` from the repository root after dependencies are installed.

## Visual regression

The critical owner flow contains opt-in screenshot checkpoints. Generate or refresh baselines with `cd apps/web && bun run test:visual:update`; verify them with `bun run test:visual`. Normal E2E runs remain behavior-only.

## OpenAPI contract manifest

With the API running locally, `bun run contracts:generate` reads `/swagger/json` and generates `packages/api-client/src/generated/openapi-contract.ts`. This exposes method/path unions for tooling and contract checks without duplicating route strings manually in documentation. `bun run contracts:verify` runs the same generation in check-only mode and fails when the committed manifest is stale. File-based equivalents are available through `contracts:generate:file` and `contracts:verify:file`.
