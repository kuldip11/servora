# Servora Differentiators UI Integration Plan

**Status:** RETAINED / UI_INTEGRATION_PENDING  
**Scope:** `apps/web/src/features/differentiators/`  
**Decision:** Keep the feature in the codebase. It is intentional future product functionality, not accidental dead code.

## 1. Purpose

The Differentiators feature provides advanced operational analysis intended to explain why menu/business outcomes differ across contexts. The retained implementation includes menu engineering, live availability analysis, order explainability, guided combo/promotion building, and approval-rule workflows.

The feature is useful, but it is not currently exposed through the production navigation/route surface. It must therefore remain isolated until a deliberate UI integration is completed and verified.

## 2. Current retained capability

The existing feature tree contains:

- menu engineering analysis;
- live availability differentiators;
- order explainability;
- guided combo/promotion builder;
- approval-rule workflows;
- feature tests and supporting helpers/components.

Current automated unit/integration tests for the retained Differentiators feature pass after the shared Select migration.

## 3. Why it is intentionally exempted from the orphan/dead-code audit

The feature currently has no production route/side-navigation entry. Normally that would make its production files orphan candidates. It is explicitly exempted because the product decision is to retain the capability for future UI integration.

The exemption must be removed when the feature is given a real production route and normal import reachability.

## 4. Required work before production UI exposure

### D0 — Product placement

- Decide whether Differentiators lives under Analytics, Menu, Operations, or its own navigation group.
- Finalize route naming and information architecture.
- Define which roles can discover and open the feature.

### D1 — API and contract re-audit

- Verify every API endpoint used by the feature still exists.
- Confirm request/response contracts match the current generated client/contracts.
- Verify response validation and error states.
- Remove any compatibility code that is no longer required.

### D2 — Authorization and tenancy

- Verify organization/tenant/franchise/branch isolation.
- Define required permissions for each panel/action.
- Confirm UI permission checks match server authorization.
- Verify direct API attempts remain authoritative and secure.

### D3 — UI integration

- Add the chosen production route.
- Add navigation entry where appropriate.
- Add breadcrumbs/page metadata.
- Preserve responsive behavior and accessibility.
- Ensure the canonical shared `Select` and other design-system components are used.

### D4 — Cross-feature validation

- Verify menu engineering data against current Menu/Orders analytics.
- Verify availability differentiators against current availability/schedule/branch override behavior.
- Verify guided builder outputs against current combo/promotion contracts.
- Verify order explainability against current order/pricing/explainability models.

### D5 — E2E coverage

Add browser/system tests for at least:

- authorized navigation to the feature;
- unauthorized/forbidden access;
- menu engineering filter workflow;
- availability analysis workflow;
- order explainability workflow;
- guided builder happy path;
- branch/tenant isolation;
- API failure and empty/stale-state behavior.

These should include real full-stack coverage where practical, not only mocked API responses.

### D6 — Release gate

- lint/typecheck/tests/build green;
- required E2E flows green;
- no dead-code exemption required after route integration;
- product/UX placement reviewed;
- documentation updated.

## 5. Status tracker

| ID  | Workstream                         | Status  | Evidence / next action                                                 |
| --- | ---------------------------------- | ------- | ---------------------------------------------------------------------- |
| D0  | Product placement / route decision | PENDING | Decide production route and navigation placement.                      |
| D1  | API/contract re-audit              | PENDING | Revalidate retained feature against current contracts before exposure. |
| D2  | Authorization / tenancy audit      | PENDING | Confirm permissions and tenant/branch isolation.                       |
| D3  | Production UI integration          | PENDING | Add route/navigation only after D0–D2.                                 |
| D4  | Cross-feature validation           | PENDING | Validate against current Menu/Orders/Availability behavior.            |
| D5  | E2E coverage                       | PENDING | Add UI and full-stack system journeys.                                 |
| D6  | Release gate                       | PENDING | Remove dead-code exemption after real route integration.               |

## 6. Guardrail

Do not delete `apps/web/src/features/differentiators/` as ordinary dead code while this document remains active. Do not expose it in production by simply adding a route without completing the API, permission, tenancy, and E2E review above.
