# Servora E2E & System Testing Strategy Plan

**Status:** IN_PROGRESS  
**Scope:** Web, Waiter, Kitchen, Customer, API, realtime, database, permissions, contracts, and cross-app workflows  
**Primary objective:** Detect regressions that unit/component tests cannot catch by validating real business journeys across connected Servora components.

## 1. Why this work exists

Servora already has substantial unit/component/integration coverage, but recent failures demonstrated that high isolated coverage does not guarantee system correctness.

A concrete example was the active-menu response contract:

```text
mapper added memberships
+
strict response schema rejected memberships
=
real GET /menu/menus/active returned 400
```

Individual components could still appear correct in isolation. The failure existed in the connection between mapper, contract, route validation, API client, and UI.

Servora is particularly exposed to this class of regression because one business domain is consumed by multiple applications:

```text
Web
Waiter
Kitchen
Customer
API
Realtime
Postgres
Redis
```

A developer changing one shared contract, permission, menu field, order state, pricing rule, or realtime event can unintentionally break another application.

## 2. Testing philosophy

The target is **not** to replace unit tests with thousands of browser tests or to chase a meaningless "100% E2E coverage" number.

Use layered coverage:

```text
                    SYSTEM / CROSS-APP E2E
                  critical business journeys
              ─────────────────────────────────
                    UI E2E / browser workflows
              routing, forms, UI states, a11y
          ─────────────────────────────────────────
                 INTEGRATION / CONTRACT TESTS
             API + schema + DB + API client
        ─────────────────────────────────────────────
                         UNIT TESTS
           pure logic, components, helpers, pricing
```

Each layer has a different purpose and none replaces the others.

## 3. Current known E2E state

At the current audit point:

### Web

Existing Playwright infrastructure includes:

```text
apps/web/playwright.config.ts
apps/web/tests/critical-order-flow.spec.ts
apps/web/tests/accessibility/error-handling-accessibility.spec.ts
```

The critical-order flow currently uses API interception/mocking for broad `/api/**` traffic. This is useful for frontend workflow validation but cannot catch backend contract/integration failures.

### Website

Existing browser coverage includes smoke/routes/accessibility-oriented tests.

### Waiter / Kitchen / Customer

These apps do not yet have equivalent comprehensive independent/system E2E coverage comparable to the desired target.

### Key gap

Servora currently has UI/browser tests, but insufficient **real full-stack browser → API → DB → response contract → UI** coverage and insufficient **cross-app** coverage.

## 4. Two separate browser-test classes

### 4.1 UI E2E with mocked API

Keep and expand fast deterministic browser suites where the API is intentionally mocked.

Purpose:

- routing;
- form interaction;
- validation visibility;
- loading/empty/error states;
- dialog behavior;
- accessibility;
- responsive workflows;
- UI-only edge cases;
- deterministic frontend regression testing.

These should remain fast enough for every PR.

### 4.2 Full-stack/system E2E

Add a second class of Playwright tests that does **not** intercept critical API traffic.

Target flow:

```text
Playwright browser
    ↓
Web / Waiter / Kitchen / Customer
    ↓
real frontend API client
    ↓
real API route
    ↓
request validation
    ↓
service/domain logic
    ↓
repository
    ↓
Postgres / Redis
    ↓
response mapper
    ↓
response contract validation
    ↓
real browser UI
```

This layer would have caught the active-menu `memberships` regression.

## 5. Integration/contract layer — required companion to E2E

Full browser E2E is slower and should not be the only protection against API-contract drift.

Add/standardize contract tests that exercise actual route/controller output against response schemas, preferably through Fastify injection where practical.

Examples:

```text
Fastify.inject()
  → route
  → service/mapper
  → response schema/serialization
```

Every important response contract should be exercised with realistic payloads, especially strict TypeBox schemas, unions, intersections, optional extensions, and nested arrays.

Priority contract areas:

- active menus and memberships;
- item variants/modifiers/combos;
- orders and order items;
- pricing breakdowns;
- branch/franchise/organization payloads;
- staff/role/permission payloads;
- inventory/recipe relationships;
- realtime event payloads.

## 6. E2E environment architecture

System E2E should run against isolated infrastructure:

```text
Postgres
Redis
API
Web
Waiter
Kitchen
Customer
```

Do not run system E2E against a developer's normal database.

Recommended dedicated database naming/concept:

```text
servora_e2e
```

Each run should:

1. provision/reset isolated storage;
2. run migrations;
3. seed deterministic E2E fixtures;
4. start required services/apps;
5. wait for health checks;
6. run Playwright;
7. collect traces/screenshots/logs on failure;
8. tear down/clean up.

For parallel CI, prefer an isolated database/schema/container per run rather than shared mutable state.

## 7. Dedicated E2E fixture strategy

Do not use the full large demo dataset for every critical E2E run.

Add a deterministic command such as:

```bash
bun run e2e:seed
```

The E2E fixture should be minimal, explicit, and stable.

Candidate stable identities:

```text
owner@e2e.servora.test
franchise-admin@e2e.servora.test
manager@e2e.servora.test
waiter@e2e.servora.test
chef@e2e.servora.test
cashier@e2e.servora.test

tenant-e2e
franchise-main-e2e
branch-main-e2e
table-1-e2e
```

Use deterministic fixtures rather than random data unless randomness is itself under test.

## 8. Test setup should not overuse the UI

E2E should validate the workflow under test, not spend most of its time preparing unrelated state through dozens of clicks.

For example, if an order test needs a menu with many items, create the prerequisite state through controlled fixture builders/API setup rather than creating 20 items manually in the browser.

Use the UI for the actual behavior being validated.

## 9. Critical system E2E journeys

### E1 — Authentication and context

Cover:

- Owner login;
- Franchise Admin login;
- Manager login;
- Waiter login;
- Kitchen/Chef login;
- session refresh;
- logout;
- organization/franchise/branch context selection;
- first/default context selection;
- invalid/expired session behavior;
- unauthorized role access.

### E2 — Business onboarding

Cover:

```text
signup
→ organization creation
→ franchise creation
→ branch creation
→ default context selection
→ usable authenticated application
```

### E3 — Menu publishing and active menu

This is a P0 regression area.

Cover:

```text
create category
create item
add variant/modifier where relevant
configure status/availability
configure menu membership
publish/activate menu
GET active menu through real API
verify item appears in ordering client
```

Verify at least Web/Waiter/Customer consumers as appropriate.

Include realistic `memberships` payloads so the recently fixed contract drift cannot recur unnoticed.

### E4 — Full order lifecycle

This should be one of the highest-priority cross-app tests:

```text
Waiter or Web creates order
        ↓
API persists order
        ↓
Kitchen receives ticket
        ↓
Kitchen marks PREPARING
        ↓
Kitchen marks READY
        ↓
Waiter/Web observes READY
        ↓
Waiter marks SERVED
        ↓
Billing/payment
        ↓
Order completes
```

This validates multiple applications, permissions, API state transitions, persistence, and realtime behavior.

### E5 — Pricing authority

Cover combinations of:

- base price;
- variants;
- modifiers;
- combos;
- promotions;
- price rules;
- taxes;
- service charge;
- discounts;
- final total.

The E2E assertion must rely on the server-calculated result, not duplicate pricing rules in test code.

### E6 — Availability and visibility

Cover interactions between:

- base item status;
- schedule;
- branch override;
- active menu membership;
- inventory/sold-out state where supported;
- ordering channel;
- fulfillment type.

Verify visibility consistently in Web, Waiter, and Customer where relevant.

### E7 — Roles, permissions, and tenant isolation

For critical roles:

```text
allowed action → succeeds
forbidden UI action → unavailable/blocked
direct API attempt → 403
```

Also verify:

- tenant A cannot read/write tenant B;
- branch-scoped roles cannot access unauthorized branch resources;
- Owner/Franchise Admin/Manager capabilities remain correct;
- Waiter/Kitchen roles cannot access management-only areas.

### E8 — Inventory and recipe effects

Cover:

```text
inventory item
→ recipe mapping
→ order placement
→ expected deduction/update
→ stock/availability behavior
```

Also cover manual stock adjustments/waste where critical.

### E9 — Billing/payment

Cover critical paths such as:

- whole payment;
- split payment where supported;
- bill state transition;
- completed payment/order status;
- reopening/printing behavior where applicable.

### E10 — Realtime cross-app synchronization

Cover at least:

```text
Waiter creates/updates order
↔ Kitchen receives change
↔ Kitchen updates status
↔ Waiter/Web receives status
```

Do not validate only polling/refetch behavior if realtime delivery is part of the product contract.

## 10. Cross-app Playwright structure

Long term, establish an E2E orchestration layer capable of projects such as:

```text
web
waiter
kitchen
customer
cross-app
```

Website may remain separate because its marketing/SEO concerns are materially different.

Cross-app tests may use multiple browser contexts/pages in one scenario while sharing the same seeded tenant/branch/order state.

## 11. CI strategy

### Pull requests

Required fast gates:

```text
lint
typecheck
unit/component tests
integration/contract tests
build
fast UI E2E
critical full-stack E2E smoke
```

The critical full-stack smoke suite should stay small and high-value so developers receive feedback quickly.

### Merge to develop/main

Run the above plus expanded:

- full-stack menu flows;
- order lifecycle;
- pricing;
- availability;
- RBAC/tenant isolation;
- cross-app realtime flows;
- migration verification.

### Nightly / scheduled regression

Run broader suites:

- expanded full-stack matrix;
- additional browsers if valuable;
- visual regression where stable;
- larger dataset/demo scenarios;
- long-running workflows;
- performance smoke checks;
- flaky-test detection/retries with reporting.

## 12. Failure diagnostics

On E2E failure, CI should retain enough evidence to debug without reproducing immediately:

- Playwright trace;
- screenshot;
- video where useful;
- browser console logs;
- network failure summary;
- API logs correlated by request ID;
- seeded fixture/run identifier;
- relevant server error body;
- database reset/migration version information.

Servora already emits request IDs in API errors; E2E logging should preserve and surface them.

## 13. Flake policy

Do not hide flaky E2E tests with unlimited retries.

Policy:

- deterministic fixtures;
- explicit service readiness checks;
- avoid arbitrary sleeps;
- wait on observable UI/network state;
- limited CI retry only for diagnostics;
- repeated flaky tests become tracked defects;
- quarantine only temporarily with an owner and expiry/issue reference.

## 14. Phase plan

### E0 — Existing coverage audit

- [x] Identify current Web/Website Playwright coverage.
- [x] Distinguish mocked UI E2E from full-stack E2E.
- [x] Identify missing Waiter/Kitchen/Customer system coverage.
- [x] Document the active-menu contract failure as a system-test gap example.

### E1 — E2E infrastructure foundation

- [ ] Define root/system E2E directory and configuration.
- [ ] Define app base URLs and service startup strategy.
- [ ] Add isolated Postgres/Redis E2E environment.
- [ ] Add migration/reset lifecycle.
- [ ] Add deterministic `e2e:seed` fixtures.
- [ ] Add health/readiness checks.
- [ ] Add trace/screenshot/log artifact retention.

### E2 — API contract/integration hardening

- [ ] Audit important strict response schemas.
- [ ] Add Fastify injection/route-contract tests for active menus.
- [ ] Add contract coverage for orders/pricing/menu variants/modifiers/combos.
- [ ] Add permission/tenant isolation integration coverage.
- [ ] Ensure API-client expectations match public contracts.

### E3 — Critical full-stack smoke suite

Initial required flows:

1. [ ] Owner/Manager login + context selection.
2. [ ] Active menu retrieval with real membership data.
3. [ ] Create order through real frontend/API/DB.
4. [ ] Kitchen receives order and moves it to READY.
5. [ ] Waiter/Web observes READY and serves order.

These should become PR-blocking after stabilization.

### E4 — Menu/availability/pricing system coverage

- [ ] Menu creation/publishing/membership.
- [ ] Variants/modifiers.
- [ ] Combos.
- [ ] Promotions/price rules.
- [ ] Tax/service charge.
- [ ] Scheduling/branch overrides.
- [ ] Customer/Waiter/Web visibility parity.

### E5 — RBAC and tenant isolation

- [ ] Owner.
- [ ] Franchise Admin.
- [ ] Manager.
- [ ] Waiter.
- [ ] Chef/Kitchen.
- [ ] Cashier/other relevant roles.
- [ ] Cross-tenant denial.
- [ ] Cross-branch denial.
- [ ] Direct API authorization checks.

### E6 — Inventory, billing, and secondary business flows

- [ ] Inventory/recipe deductions.
- [ ] Stock adjustments/waste.
- [ ] Billing/payment critical flows.
- [ ] Split payment if supported.
- [ ] Remaining P0/P1 operational journeys.

### E7 — Cross-app realtime suite

- [ ] Waiter → Kitchen order arrival.
- [ ] Kitchen → Waiter/Web status updates.
- [ ] Reconnect/resubscribe behavior where applicable.
- [ ] Duplicate/missed realtime event safeguards.

### E8 — CI rollout

- [ ] PR fast UI E2E.
- [ ] PR critical full-stack smoke.
- [ ] Merge expanded suite.
- [ ] Nightly regression suite.
- [ ] Artifact retention/reporting.
- [ ] Flake reporting policy.

### E9 — Coverage and risk review

- [ ] Map critical business capabilities to at least one system/integration test.
- [ ] Identify unprotected cross-app dependencies.
- [ ] Review escaped production/pre-production defects and add regression coverage.
- [ ] Measure suite duration and optimize fixture/setup bottlenecks.
- [ ] Update this tracker with final evidence.

## 15. Status tracker

| ID  | Workstream                                | Status      | Evidence / next action                                                               |
| --- | ----------------------------------------- | ----------- | ------------------------------------------------------------------------------------ |
| E0  | Existing E2E/coverage audit               | COMPLETED   | Existing mocked Web/Website Playwright coverage and full-stack gap documented.       |
| E1  | E2E infrastructure foundation             | PENDING     | Build isolated DB/Redis/service orchestration and deterministic seed.                |
| E2  | API contract/integration hardening        | IN_PROGRESS | Active-menu regression contract test exists; expand systematically across contracts. |
| E3  | Critical full-stack smoke                 | PENDING     | Implement login/context, active menu, order→kitchen→served journey.                  |
| E4  | Menu/availability/pricing system coverage | PENDING     | Prioritize because these are shared across ordering clients.                         |
| E5  | RBAC/tenant isolation                     | PENDING     | Add role matrix and cross-tenant/branch system tests.                                |
| E6  | Inventory/billing secondary flows         | PENDING     | Add after core ordering path stabilizes.                                             |
| E7  | Cross-app realtime                        | PENDING     | Requires multi-context/application orchestration.                                    |
| E8  | CI rollout                                | PENDING     | Promote stable suites progressively to blocking gates.                               |
| E9  | Final risk/coverage review                | PENDING     | Map business capabilities to integration/system protection.                          |

## 16. Initial recommended implementation order

Before the large cleanup/refactor program begins:

1. establish E1 infrastructure;
2. complete the highest-value E2 contract checks;
3. implement the E3 critical full-stack smoke tests;
4. make those stable in CI;
5. begin Select consolidation and P0 component cleanup;
6. add/expand feature E2E as each high-risk area is refactored.

This sequencing ensures cleanup work happens behind a real system-level safety net.

## 17. Definition of done

The E2E program is complete when:

- Servora has distinct UI-mocked and full-stack browser suites;
- critical flows run against real API/DB infrastructure;
- Web, Waiter, Kitchen, and Customer have appropriate system coverage;
- at least one cross-app order/realtime flow is mandatory in CI;
- active-menu/menu/pricing/availability contracts are protected end-to-end;
- RBAC and tenant isolation are exercised beyond unit mocks;
- deterministic isolated fixtures exist;
- PR, merge, and nightly suites have clear scopes;
- failure diagnostics are retained and actionable;
- flaky tests are actively managed rather than hidden;
- escaped regressions result in new integration/system coverage;
- the cleanup program can refactor high-risk code with confidence.
