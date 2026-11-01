# Code quality and architecture remediation status

**Last verified:** 2026-09-30  
**Overall status:** IN PROGRESS

This tracker records implementation facts for the code-quality and architecture remediation that follows the independent repository audit. Product feature scope is unchanged.

## Current checkpoint

### Phase 1 complete; Phase 2 repository boundaries started

**Status:** IN PROGRESS

Implemented:

- formatted the full repository and restored a passing `format:check` gate;
- added a Settings feature public entry point and removed the failing Orders-to-Settings deep import;
- added root `verify:quality`, matching the CI sequence for formatting, lint, cleanup checks, contract generation, typechecking, tests, and builds;
- made OpenAPI generation emit canonical Prettier-formatted TypeScript so `contracts:verify` and `format:check` can both pass from the same generated file;
- migrated the shared Orders API client from handwritten `@pos/types` response models to schema-derived `@pos/contracts` DTOs;
- exported explicit `OrderDto`, `OrderKitchenTicketDto`, and `CancellationReasonDto` API-boundary types and migrated Web/Waiter consumers;
- migrated the Kitchen API client and Kitchen Display consumers to schema-derived ticket/station DTOs;
- migrated Branches, Tables, Loyalty Customers, Customer Groups, Analytics, and Billing client responses to schema-derived DTOs;
- migrated Auth users/tokens/memberships, Inventory items/transactions/waste/recipe impact, and the shared success/pagination envelopes to schema-derived contracts;
- migrated the remaining Menu client response surface—including menus, categories, items, availability overrides, schedules, recipes, sub-recipes, modifiers, templates, combos, promotions, price rules, allergens, tags, loyalty tiers, and kitchen routes—to schema-derived DTOs;
- removed Menu client generic response escape hatches and the API client's dependency on handwritten `@pos/types` transport models;
- exported TypeScript request/result aliases from existing contract schemas so client methods and UI mutation boundaries share the server-owned unions;
- made Menu mutations expose their declared result bodies for stock counts, availability overrides, publishing, recipes, templates, branch/channel overrides, and previews instead of discarding or caller-casting them;
- stopped create-item requests from sending update-only null reset values while preserving those resets for item updates;
- migrated Web, Waiter, and Kitchen auth consumers to the public auth DTOs, removing assumptions that membership summaries contain full tenant profile fields;
- exposed the contract-defined Inventory stock/waste result instead of discarding it and constrained inventory unit/transaction inputs to server-owned unions;
- replaced unconstrained table-status strings and Analytics response generics with contract-owned unions and response types;
- made Billing expose the atomic payment result instead of discarding it, and typed bill/split results from the server contract;
- fixed aggregate table grouping/search to join the canonical table `branchId` with the loaded branch list instead of reading a `branch` object that the API never returns;
- stopped branch forms from sending unsupported `status`/`isActive` fields or an invalid null phone; inactive saves now use the supported deactivate operation after saving accepted fields;
- separated the ticket status visible in queue responses from the narrower status accepted by the update endpoint;
- changed order realtime handling to refresh canonical HTTP DTO queries instead of writing internal realtime aggregates into DTO caches;
- limited kitchen-ticket cache patches to shared status/timestamp fields so reduced realtime payloads cannot erase detailed order-line data;
- changed Kitchen realtime events to immediately invalidate and refetch the canonical contextual queue;
- renamed `staffRepository.updateUser` to `updateGlobalUserProfile`, removed its misleading tenant parameter, and documented that tenant authorization occurs in the service;
- separated global name fields from membership status so a status value cannot leak into the global users-table update.
- defined the public realtime wire protocol as a discriminated, schema-derived contract with event-specific payloads and runtime guards;
- mapped Orders, Kitchen, Billing, Customer Requests, Tables, Inventory, and Availability publication data to public DTOs before publishing and reject invalid envelopes at the event bus boundary;
- made the shared realtime client validate inbound frames and enabled validation in Web, Waiter, and Kitchen, while the Customer app validates both connection and event frames on its direct socket;
- removed the obsolete handwritten realtime transport model from `@pos/types` and made `@pos/realtime` re-export the canonical contract;
- aligned Customer order progress and Waiter customer-request caches with schema-derived DTOs, including complete realtime customer-request payloads and the HELD/PENDING_PAYMENT progress states;
- made the Customer Requests API client return declared response bodies and removed its generic response escape hatch.
- removed all 270 findings from the strict unused-symbol audit and enabled `noUnusedLocals` and `noUnusedParameters` in all 15 workspaces;
- removed stale component props and form-state destructuring found by the audit, and removed an obsolete order-status controller parameter that accepted an approval token without forwarding it.
- added type-aware ESLint infrastructure with project-service analysis, React Hooks enforcement, and duplicate/self-import enforcement;
- corrected all 25 React Hooks findings, including named TanStack Router components, stable derived query data, complete effect dependencies, and guarded one-time item confirmation;
- consolidated 48 duplicate imports and measured the remaining Promise-safety backlog at 212 findings (148 production and 64 test findings) without suppressing it.
- made all 91 intentional production background invalidations and navigation calls explicit, then promoted `no-floating-promises` to an error for production source files.
- awaited all 64 test-side React `act`, query-function, and API promises, while explicitly marking the single intentionally detached mock callback;
- wrapped all 57 async UI handlers and void-return callbacks so their returned promises cannot leak through React or callback APIs;
- promoted both type-aware Promise-safety rules to errors across application and test source; deterministic uncached lint now reports zero findings.
- removed 57 production imports that reached into another feature's internal modules and routed those dependencies through explicit public entry points;
- added narrow public modules for query keys, route components, branch context, waiter attention, and cancellation reasons so small consumers do not evaluate an entire feature barrel;
- moved Web authentication transport and Waiter/Kitchen authentication storage into their shared layers, eliminating 10 low-level shared-to-feature dependency inversions;
- expanded the dependency-boundary audit to cover static and dynamic imports, alias and relative cross-feature paths, low-level shared-layer direction, and direct workspace-package `src` imports;
- verified the expanded boundary rules across 1,268 production TypeScript files and corrected test mocks to target the same narrow public contracts used by production code.
- added compile-time conformance assertions that compare API-client facade results with both server-owned contract DTOs and generated OpenAPI operation responses;
- migrated the remaining Staff, Approvals, Availability, Audit, Settings, Organizations, and order-explanation domain methods away from generic or handwritten response escape hatches;
- made Staff mutation results, approval tokens and thresholds, organization management, tenant settings, availability dashboards, audit entries, and order explanations expose their declared contract bodies;
- tightened the order-explanation schema around pricing replay, authoritative replay, and trace fields while retaining forward-compatible trace metadata;
- eliminated generic response type parameters from every public API-client domain method; generic transport helpers remain internal to the shared HTTP unwrapping layer.
- split the 1,264-line Orders repository into a stable facade and focused query, creation, ticket/refire, adjustment, and lifecycle-command repositories;
- split the remaining 516-line Order Ticket repository into a stable facade with independent new-ticket and refire transaction repositories;
- split the 426-line Auth repository into a stable facade with focused user/profile, global-role provisioning, and token/session repositories plus shared email normalization;
- split the 814-line Billing repository into a stable facade and focused payment, split, query, and refund repositories;
- split the remaining 447-line Billing Split repository into a stable facade with independent even, item, seat-share, and fractional split transactions;
- split the 424-line Billing Split domain module into compatibility exports over focused money allocation, allocation/combo validation, and seat-planning modules;
- split the 725-line Menu Item repository into a stable facade with focused read-model, query, write, variant, duplication, and association modules;
- split the 565-line Inventory repository into a stable facade with focused stock/waste, recipe-query, and transactional order-deduction repositories;
- split the 402-line Menu Modifier repository into a stable facade with focused read/ownership, group-write, option/variant-price, and tag/allergen catalog repositories;
- split the 354-line Loyalty repository into a stable facade with focused tenant-tier/customer, organization-tier, and organization-customer identity repositories;
- split the 672-line Menu Availability repository into a stable facade with focused dashboard, state/computed-availability, channel, schedule/holiday, and branch-override repositories;
- split the 675-line Menu Availability service into a stable facade with focused inventory-signal, schedule-resolution, override-management, and effective-item services;
- split the 788-line Inventory Recipe service into a stable facade, a shared recipe-expansion resolver, and focused impact, validation/costing, deduction, and availability-synchronization services;
- split the 533-line Menu Price Rule service into a stable facade with public input types, centralized scope/overlap validation, lifecycle operations, and happy-hour orchestration;
- split the 519-line Menu Item service into a stable facade with public input types and focused query, validation, create/update, lifecycle, publication, and availability responsibilities;
- split the 425-line Menu Promotion service into a stable facade with public input types and focused validation/normalization, pricing-preview, and lifecycle/statistics services;
- split the 511-line Customer Order service into a stable facade with focused request/pricing preparation, idempotent persistence/concurrency recovery, and payment/realtime/inventory completion stages;
- split the 474-line Customer Payment service into a stable facade with a Razorpay provider client and focused takeaway-payment, cash-checkout, and customer-scoped order-query services;
- split the 420-line Order Kitchen service into a stable facade with independent paid-refire/repricing and unlimited-refill workflows;
- split the 408-line Organization service into a stable facade with shared management authorization and focused organization-profile, loyalty-tier, and organization-menu services;
- split the 345-line Billing service into a stable facade with public input types and focused payment/realtime completion, bill splitting, refund, and query services;
- split the 324-line Auth service into a stable facade with focused registration/login, application-access, token/session lifecycle, and identity/profile/password services while retaining the tested token-issuance compatibility method;
- split the 369-line Create Order workflow into a stable orchestrator with public input types and focused validation/context, pricing/snapshot, persistence, and realtime/inventory completion stages;
- split the 320-line Order Fire workflow into a stable orchestrator with public input types and focused access/input validation, active-order repricing, course-aware ticket persistence, and realtime/inventory completion stages;
- split the 318-line Menu Modifier service into a stable facade with public input types, independent dependency/price validation helpers, modifier-group lifecycle operations, and tag/allergen catalog operations;
- split the 310-line Razorpay Webhook service into a stable facade with shared signature/payload validation, idempotent durable ingestion/queueing, and asynchronous payment/ticket/inventory reconciliation services;
- completed Customer feature root entry points for cart, menu, order, ordering, service requests, and session state, and routed the application shell through those public boundaries instead of feature internals;
- completed Web root entry points for every feature and routed all lazy pages through narrow public page modules, preserving feature-level code splitting while removing router imports into feature internals;
- decomposed the 377-line Item Advanced Options component into a 161-line composition root with focused pricing/stock, ordering-experience, recipe-deduction, and post-save operational-panel sections;
- decomposed the 376-line Sub-recipe Editor into a 71-line composition root with a dedicated validation/payload form hook and focused batch-field and ingredient-row components;
- decomposed the 366-line Waiter Item Customizer into a 139-line view backed by a focused behavioral model hook for derived pricing, modifier/guided-step validation, auto-confirm lifecycle, and cart payload mapping;
- decomposed the 360-line Branch modal into a 140-line form orchestrator with focused detail/policy, schedule/receipt, capability, and mutation-action sections;
- preserved existing repository and service facades so imports, inferred aggregate types, shared item-detail relations, exported stock-result/input/replay types, and test mocks retain their public API while responsibilities become independently readable.

Verified quality results:

- `bun run verify:quality`: PASS after the Orders, Order Ticket, Auth, Billing, Billing Split, Menu Item, Menu Modifier, Inventory, Loyalty, and Menu Availability repository splits plus the Billing Split domain and Menu Availability, Inventory Recipe, Menu Price Rule, Menu Item, Menu Promotion, Customer Order, Customer Payment, Order Kitchen, and Organization service splits;
- formatting: PASS;
- lint: PASS with zero errors or warnings for accessibility, React Hooks, duplicate/self-import, and both type-aware Promise-safety rules;
- cleanup conventions, expanded dependency boundaries (1,352 production TypeScript files), and dead-code scan: PASS;
- OpenAPI generation: current at 229 operations / 267 schemas;
- typecheck: 15/15 workspaces;
- tests: 728 files / 2,969 tests across 21/21 Turbo tasks;
- builds: 6/6 build-producing applications/packages;
- focused Auth tests: Web 55, Waiter 23, Kitchen 22;
- focused Inventory tests: Web 50; API client domain tests: 5;
- focused Menu tests: Web 133, Waiter 48, API client 39, Contracts 5;
- focused realtime tests: Contracts 3, shared realtime 11, API publication/gateway/scope/mapper 16, Customer socket 5;
- focused repository tests: Orders and inventory reversal contract 10, Billing 25, Menu Item and Category 14, Inventory repository/stock/waste/reversal 19, Menu Availability repository 47; focused Availability service and cross-feature consumers: 66; focused Inventory Recipe service and recipe consumers: 73;
- focused Menu Price Rule service and menu-write audit tests: 6 files / 35 tests;
- focused Menu Item service, adversarial-access, and menu-write audit tests: 13 files / 45 tests;
- focused Order Ticket repository, Orders service, and Customer order tests: 3 files / 52 tests;
- focused Menu Promotion service, pricing pipeline, promotion stage, and menu-write audit tests: 10 files / 85 tests;
- focused Auth module and core authorization tests: 14 files / 70 tests;
- focused Menu Modifier repository/service, Menu Item integration, and adversarial-access tests: 12 files / 41 tests;
- focused Customer Order workflow and Order repository tests: 2 files / 26 tests;
- focused Customer Payment and Customer Order integration tests: 2 files / 34 tests;
- focused Billing Split domain, repository, and service tests: 4 files / 56 tests;
- focused Order Kitchen service tests: 1 file / 26 tests;
- focused Organization service/repository/route and organization-loyalty tests: 7 files / 23 tests;
- focused Loyalty repository/service/route, organization identity, and Customer Order integration tests: 6 files / 45 tests;
- focused Billing service, split, and controller tests: 4 files / 47 tests;
- focused Auth service, route, controller, and application-access tests: 4 files / 34 tests;
- focused Create Order workflow, repository, and route tests: 3 files / 35 tests;
- focused Order Fire service, sequencing helpers, controller, and route tests: 4 files / 38 tests;
- focused Menu Modifier service, controller, route, and menu-write audit tests: 6 files / 31 tests;
- focused Razorpay webhook service, route, and worker tests: 3 files / 19 tests;
- Customer public-boundary suite: 36 files / 112 tests, plus production typecheck and build;
- focused Web route/public-page rendering tests: 2 files / 5 tests, plus production typecheck and build;
- focused Item Advanced Options and form-section tests: 3 files / 6 tests;
- focused Sub-recipe editor/manager tests: 1 file / 4 tests;
- focused Waiter item-customizer and menu interaction tests: 3 files / 9 tests;
- focused Branch modal and Business-page behavior tests: 1 file / 7 tests;
- full API suite: 321 files / 1,865 tests;
- full Customer suite: 36 files / 112 tests;
- full Kitchen suite: 31 files / 80 tests;
- full Web suite: 181 files / 516 tests;
- full Waiter suite: 75 files / 137 tests.

Known non-failing output remains:

- existing React `act(...)` warnings in several Web page tests;
- an existing mocked `loading` DOM-prop warning;
- expected log output from negative/error-path API and Website tests;
- Vite chunk-size warnings for Waiter and Kitchen;
- missing `VITE_PUBLIC_APP_URL` substitution warnings outside production.

## Remaining work

### Phase 1 — correctness and enforcement

**Status:** VERIFIED

All planned Phase 1 correctness and enforcement work is implemented. New transport or domain methods must satisfy the generated-operation conformance assertions during `@pos/api-client` typechecking.

### Phase 2 — structural consistency

**Status:** IN PROGRESS

Orders, Order Ticket, Auth, Billing, Billing Split, Menu Item, Menu Modifier, Inventory, Loyalty, and Menu Availability repository boundaries plus the Billing Split domain and Menu Availability, Inventory Recipe, Menu Price Rule, Menu Item, Menu Promotion, Customer Order, Customer Payment, Order Kitchen, Organization, Billing, Auth, Create Order, Order Fire, Menu Modifier, and Razorpay Webhook service boundaries are implemented. The remaining Phase 2 work is:

- continue splitting oversized repositories and services around read, write, mapping, and transaction responsibilities;
- decompose oversized UI components around form models, payload mapping, and coherent sections;
- consolidate only behaviorally identical operational-app infrastructure.

### Phase 3 — test and delivery maturity

**Status:** PENDING

- reduce broad UI and TanStack Query mocks;
- add realistic coverage thresholds and fail on unexpected console warnings;
- add critical browser journeys for Waiter, Kitchen, and Customer;
- add dependency/security/container scanning and dependency-update automation;
- tighten bundle budgets from measured production baselines.

### Phase 4 — documentation consolidation

**Status:** PENDING

- reconcile stale completion claims and archive superseded plans/status files;
- remove duplicate documentation-index entries;
- add ADRs for transport DTO ownership, realtime wire contracts, tenancy semantics, and frontend framework choices.

## Framework decision

Keep the marketing Website on Next.js. Keep Web, Waiter, Kitchen, and Customer on React + Vite until a measured rendering, SEO, BFF, or hosting requirement justifies a targeted migration. Framework migration is not part of the current remediation.
