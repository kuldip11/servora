# Servora Codebase Cleanup & Refactor Plan

**Status:** COMPLETED (cleanup implementation and quality verification; full-stack E2E rollout remains tracked separately)  
**Scope:** All first-party Servora apps and packages  
**Primary objective:** Reduce unnecessary complexity and duplication while preserving behavior, accessibility, API contracts, authorization, validation, pricing, availability, and UI/UX.

## 1. Why this work exists

Servora has accumulated several kinds of maintainability debt as features expanded:

- oversized components that mix orchestration, form state, validation, data transformation, mutations, dialogs, and rendering;
- duplicate UI abstractions, especially the current `Select` and `SelectMenu` components;
- repetitive JSX and unnecessary wrappers/expressions;
- duplicated constants, transformation logic, and domain presentation logic inside components;
- fragile test mocks that replace shared components or whole libraries instead of mocking only external boundaries;
- inconsistent feature boundaries and deep imports;
- static option/configuration data declared inside render paths;
- components that are large because of mixed responsibilities rather than legitimate declarative structure.

The cleanup must be behavior-preserving. This is not a redesign and must not become an excuse for unrelated business-logic changes.

## 2. Cleanup principles

1. **Refactor by responsibility, not line count alone.** A large generated/schema file can be acceptable; a 300-line component mixing five responsibilities is not.
2. **One change set at a time.** Avoid broad unrelated rewrites.
3. **Preserve public behavior and backward compatibility unless a migration is explicitly planned.**
4. **Do not duplicate pricing, availability, permission, or validation rules in UI code.**
5. **Keep server-side pricing and authorization authoritative.**
6. **Do not weaken validation or accessibility during cleanup.**
7. **Prefer real shared UI components in tests; mock network/data boundaries instead.**
8. **Every structural extraction must leave tests, typecheck, lint, and builds green.**
9. **E2E protection should be added before the highest-risk refactors.**
10. **Generated files are excluded from component-size cleanup unless the generation source itself is wrong.**

## 3. Current high-priority cleanup targets

The following production TSX files were identified as high-value decomposition candidates because they are large and/or combine multiple responsibilities:

| Target                              | Approx. size at audit | Main cleanup concern                                         | Priority |
| ----------------------------------- | --------------------: | ------------------------------------------------------------ | -------- |
| `CombosSection.tsx`                 |             675 lines | form state, dynamic groups, validation, mutations, rendering | P0       |
| `PromotionsSection.tsx`             |             621 lines | targeting, scheduling, validation, mutations, list/editor    | P0       |
| `RecipeBuilder.tsx`                 |             560 lines | dynamic rows, validation, API errors, calculations           | P0       |
| `DataGrid.tsx`                      |             546 lines | reusable UI complexity / responsibility review               | P1       |
| `OrganizationManagementSection.tsx` |             523 lines | organization/franchise/branch orchestration                  | P0       |
| `TablesPage.tsx`                    |             522 lines | page orchestration, forms, actions, tables                   | P0       |
| `ModifierGroupsSection.tsx`         |             514 lines | option editing, validation, mutations                        | P0       |
| `GuidedBuilderPanel.tsx`            |             510 lines | workflow decomposition review                                | P1       |
| `ItemFormModal.tsx`                 |             500 lines | many field groups, transformations, validation               | P0       |
| `SubRecipeManager.tsx`              |             483 lines | list/editor/mutations/validation                             | P0       |
| Customer `ItemCustomizerModal.tsx`  |             457 lines | customization state and pricing presentation                 | P1       |
| `RoleManager.tsx`                   |             434 lines | role CRUD, permissions, form state                           | P0       |
| Waiter `ItemCustomiser.tsx`         |             429 lines | option state and order configuration                         | P1       |

Line count is only a signal. Before splitting each file, identify coherent responsibilities and extract only when the resulting boundaries are meaningful.

## 4. Select consolidation — mandatory migration

### 4.1 Desired final state

Servora must have one shared select abstraction.

Current state:

- existing native-style `Select` in `@pos/ui`;
- `SelectMenu` listbox/popover implementation in `@pos/ui`.

Target state:

- delete the existing shared native `Select` implementation;
- rename `SelectMenu` to `Select`;
- rename `SelectMenuProps` to `SelectProps`;
- use the renamed `Select` everywhere a Servora design-system select is required;
- remove all production references to `SelectMenu`;
- update exports, stories, tests, mocks, and documentation;
- do not preserve two incompatible `onChange` APIs inside one component.

### 4.2 API migration rule

Old native-style usage:

```tsx
<Select value={status} onChange={(event) => setStatus(event.target.value)} />
```

Target usage:

```tsx
<Select value={status} onChange={setStatus} options={STATUS_OPTIONS} />
```

Do **not** add a compatibility API such as `event | string`. The migration should end with one clear contract.

### 4.3 Select acceptance criteria

- [ ] Old shared native `Select` implementation deleted.
- [ ] `SelectMenu.tsx` renamed/replaced as `Select.tsx`.
- [ ] `SelectMenuProps` renamed to `SelectProps`.
- [ ] `@pos/ui` exports only the new `Select` abstraction for design-system usage.
- [ ] Production `SelectMenu` references are zero.
- [ ] Old `event.target.value` select handlers are migrated where required.
- [ ] Required marker, error, disabled, placeholder, keyboard, focus, and accessibility behavior remains covered.
- [ ] Stories and tests use the new component.
- [ ] Test mocks no longer recreate a second fake select API unless unavoidable.
- [ ] Lint/typecheck/tests/build/E2E gates pass.

## 5. Component decomposition strategy

### 5.1 Example target structure

For a large feature such as Combos:

```text
CombosSection/
  CombosSection.tsx
  ComboList.tsx
  ComboForm.tsx
  ComboGroupEditor.tsx
  ComboItemRow.tsx
  useComboForm.ts
  comboValidation.ts
  comboMappers.ts
  comboTypes.ts
```

The parent should primarily coordinate queries, selection, and high-level composition. Detailed field rendering, dynamic row editing, validation helpers, and request mapping should live in focused modules.

### 5.2 Extraction categories

Extract when a component contains multiple independent concerns:

- query/mutation orchestration;
- form lifecycle/state;
- payload mapping;
- response-to-view-model mapping;
- validation;
- option generation;
- modal/dialog content;
- dynamic collection editors;
- reusable table/list rendering;
- repeated presentation logic.

Do not extract tiny components solely to reduce a line count. Every extraction should improve cohesion, readability, reuse, or testability.

## 6. JSX and syntax cleanup

After structural decomposition is stable, clean low-value syntax noise.

Examples that should normally be simplified:

```tsx
className={"foo"}
```

→

```tsx
className = "foo";
```

```tsx
disabled={true}
```

→

```tsx
disabled;
```

```tsx
{
  condition === true && <Thing />;
}
```

→

```tsx
{
  condition && <Thing />;
}
```

Unnecessary single-child fragments should also be removed.

Do **not** mechanically remove braces that are required for expressions, callbacks, variables, `cn(...)`, computed props, or event handlers. This cleanup should be formatter/AST/lint informed rather than blind regex replacement.

## 7. Constants and render-path cleanup

Review components for static values recreated inside render functions:

- option arrays;
- status labels;
- role labels;
- action definitions;
- column definitions that do not depend on render state;
- static validation metadata;
- static configuration maps.

Move them to module-level constants or feature-level constant modules where appropriate.

## 8. Mapping and transformation cleanup

Move repeated transformations out of event handlers/components:

```text
API model → form model
form model → create payload
form model → update payload
API model → display row/view model
```

Prefer named helpers such as:

```text
toComboForm()
toCreateComboPayload()
toUpdateComboPayload()
toMenuItemViewModel()
```

These helpers must not duplicate server business rules.

## 9. Page responsibility cleanup

Pages such as Tables, Staff, Business, Inventory, and Orders should trend toward:

```text
page/route
  ├─ query and orchestration
  ├─ page header
  ├─ filters/actions
  ├─ content/list
  └─ dialogs
```

Guideline only:

- route/page: ideally below ~250–300 lines;
- feature component: ideally below ~250 lines;
- reusable UI component: ideally below ~200–250 lines.

Do not enforce these as hard lint errors until false positives are reviewed.

## 10. Duplicate domain/presentation logic audit

Search for duplicate or inconsistent implementations of:

- availability/status labels;
- role checks;
- branch/franchise option generation;
- currency formatting;
- order-status transition display;
- food-type rendering;
- API error rendering;
- form error visibility/touched behavior;
- required-field presentation;
- date/time display;
- permission-based action visibility.

Each concept should have an intentional canonical owner.

## 11. Test-mock cleanup

Avoid broad mocks such as entire `@pos/ui`, `@tanstack/react-query`, or shared API modules when only one boundary needs interception.

Preferred strategy:

- render real UI components;
- use real hooks when practical;
- mock HTTP/network/data boundaries;
- use deterministic API fixtures;
- use MSW/Playwright route mocks for UI-only tests where appropriate;
- preserve full-stack tests with no API interception for system validation.

## 12. Module-boundary cleanup

Audit and reduce:

- feature-to-feature internal imports;
- shared code importing feature internals;
- deep relative imports;
- duplicate types across features;
- barrel exports that hide circular dependencies;
- helpers living in generic `utils` when they are domain-specific;
- domain code living in UI packages.

## 13. Static guardrails to add after migration

Candidate automated rules/checks:

- forbid `SelectMenu` imports after migration;
- forbid the deleted old Select path/API;
- flag direct native `<select>` where the design-system `Select` is required, with explicit exceptions;
- dependency-boundary checks;
- formatting check in CI;
- unused export/dead-code reporting;
- component-size report/warning (initially informational, not blocking);
- duplicate constant/domain-helper review;
- contract and E2E gates required for merge.

## 14. Phased implementation plan

### C0 — Independent cleanup audit

**Goal:** establish scope, hotspots, constraints, and migration order.

Acceptance criteria:

- [x] Identify oversized/mixed-responsibility components.
- [x] Identify duplicate Select/SelectMenu abstractions.
- [x] Define behavior-preserving cleanup principles.
- [x] Define E2E-first safety dependency for high-risk refactors.

### C1 — Select consolidation

**Status: COMPLETED**

- [x] Rename `SelectMenu` → `Select`.
- [x] Rename props/types.
- [x] Delete old Select.
- [x] Migrate all consumers.
- [x] Update tests/stories/mocks touched by the migration.
- [x] Add migration guardrails.
- [x] Run final lint/typecheck/test/build verification available in this environment.

Evidence: production `SelectMenu` references = 0; production native `<select>` usage = 0; shared Select interaction tests and affected app tests pass.

### C2 — P0 component decomposition

**Status: COMPLETED**

1. [x] `CombosSection`
2. [x] `PromotionsSection`
3. [x] `RecipeBuilder`
4. [x] `ModifierGroupsSection`
5. [x] `ItemFormModal`
6. [x] `SubRecipeManager`
7. [x] `TablesPage`
8. [x] `OrganizationManagementSection`
9. [x] `RoleManager`

The refactors separate orchestration from editors, lists, row components, dialog/panel sections, mappers, and validation helpers while preserving behavior.

### C3 — Hooks, mapping, and domain-helper extraction

**Status: COMPLETED**

- [x] Extract form-state/orchestration helpers where beneficial.
- [x] Extract request/response and form payload mappers.
- [x] Move static option/config values out of render paths where identified.
- [x] Consolidate repeated UI/domain presentation helpers in touched features.

### C4 — Secondary large components

**Status: COMPLETED FOR AUDITED MIXED-RESPONSIBILITY TARGETS**

- [x] `DataGrid` responsibility decomposition.
- [x] `GuidedBuilderPanel`.
- [x] Customer/Web item customizer decomposition where beneficial.
- [x] Waiter `ItemCustomiser` helper extraction.
- [x] Staff, Inventory, Orders, Order Detail, and Create Order page/component cleanup where mixed responsibilities justified extraction.
- [x] Fresh component-size inventory generated. Remaining 300+ line files are retained as informational candidates rather than blindly split by line count.

### C5 — JSX/code hygiene

**Status: COMPLETED**

- [x] Remove unnecessary string-expression braces.
- [x] Remove unnecessary boolean expressions.
- [x] Remove unnecessary fragments/wrappers.
- [x] Remove standalone no-op JSX expressions.
- [x] Move static option arrays/constants out of render paths in touched areas.
- [x] Remove demonstrably dead components/files/exports and stale imports.
- [x] Add orphan/dead-code audit with an explicit Differentiators retention exemption.

### C6 — Module boundaries and test mocks

**Status: COMPLETED WITH CONTROLLED FOLLOW-UP**

- [x] Replace cross-feature internal imports with feature public entry points.
- [x] Cross-feature internal-import audit reports zero violations.
- [x] Convert representative/touched broad mocks to partial/real-module mocks.
- [x] Add a broad-mock cap so the count cannot increase.
- [x] Keep the remaining historical broad-mock inventory visible for gradual test cleanup rather than performing a risky unrelated rewrite.

Current broad-mock guard baseline: `@pos/ui` full mocks <= 130 and `@tanstack/react-query` full mocks <= 55.

### C7 — Automated cleanup guardrails

**Status: COMPLETED FOR CODEBASE CLEANUP; E2E GATE TRACKED SEPARATELY**

- [x] Forbid production `SelectMenu`.
- [x] Forbid production native `<select>` in the audited app/design-system surface.
- [x] Add component-size reporting.
- [x] Add dependency-boundary enforcement.
- [x] Add formatting, dead-code/orphan, and broad-mock checks.
- [x] Wire cleanup checks into CI.
- [ ] Critical full-stack/cross-app E2E merge gates — tracked in `E2E_TESTING_STRATEGY_PLAN.md` and intentionally not claimed as part of this cleanup completion.

### C8 — Final cleanup audit

**Status: COMPLETED**

- [x] Re-run oversized-component inventory.
- [x] Re-run duplicate Select/native-select audit.
- [x] Confirm no old production `SelectMenu` remnants.
- [x] Confirm lint and all workspace typechecks are green.
- [x] Execute the functional unit/integration test matrix in bounded batches.
- [x] Build Web, Waiter, Kitchen, Customer, and Website successfully.
- [x] Run formatting and cleanup/boundary/dead-code/mock guards.
- [x] Record Differentiators as an intentional retained future feature rather than accidental dead code.

## 15. Verification gates

For every cleanup milestone:

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

For changes touching critical business journeys, also run the corresponding E2E suites defined in `E2E_TESTING_STRATEGY_PLAN.md`.

## 16. Status tracker

| ID  | Workstream                         | Status    | Evidence / next action                                                                                                                                 |
| --- | ---------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C0  | Independent cleanup audit          | COMPLETED | Hotspots, duplicate abstractions, constraints, and migration order documented.                                                                         |
| C1  | Select consolidation               | COMPLETED | Canonical `Select`; no production `SelectMenu` or native `<select>` remains in audited surfaces.                                                       |
| C2  | P0 component decomposition         | COMPLETED | Priority mixed-responsibility components decomposed into cohesive boundaries.                                                                          |
| C3  | Hooks/mappers/constants extraction | COMPLETED | Payload mappers, helpers, row/editor components, and static options extracted where beneficial.                                                        |
| C4  | Secondary large-component cleanup  | COMPLETED | Secondary mixed-responsibility hotspots refactored; size report retained as informational.                                                             |
| C5  | JSX/code hygiene                   | COMPLETED | JSX noise, stale imports, orphan files, and demonstrable dead code cleaned; dead-code guard added.                                                     |
| C6  | Module boundaries/test mocks       | COMPLETED | Zero cross-feature internal imports; representative mocks converted; remaining historical full mocks capped.                                           |
| C7  | Cleanup guardrails                 | COMPLETED | Select/native-select, boundaries, dead code, broad mocks, formatting, and size reporting wired in. Full-stack E2E remains in the separate E2E program. |
| C8  | Final cleanup audit                | COMPLETED | Lint, typecheck, tests, builds, formatting, and cleanup guards verified; evidence recorded below.                                                      |

### Final verification evidence

- ESLint: PASS.
- TypeScript: PASS across all 15 workspaces.
- Prettier: PASS.
- UI cleanup conventions: PASS.
- Cross-feature internal import audit: PASS (0 violations).
- Dead-code/orphan audit: PASS with an explicit intentional exemption for the retained Differentiators feature.
- Broad-mock cap: PASS.
- Web tests: PASS (Menu 55/114, Orders 29/83, remaining Web/root suites accounted for in bounded batches).
- API tests: PASS across all module batches, including the large endpoint/error-contract suites.
- Waiter tests: PASS across all bounded groups.
- Customer: 33 files / 108 tests PASS.
- Kitchen: 29 / 78 PASS.
- Website: 7 / 25 PASS.
- Shared UI: 49 / 85 PASS.
- Foundation package suites: PASS.
- Web build: PASS.
- Waiter build: PASS.
- Kitchen build: PASS.
- Customer build: PASS.
- Website build: completed compilation, static generation, and produced `.next/BUILD_ID`.
- API compile/test verification: PASS. Exact `bun build --target bun` could not be executed because this container does not provide the standalone Bun runtime binary; the repository remains Bun-targeted and this is an environment limitation, not a source failure.

## 17. Definition of done

The cleanup program is complete when:

- one canonical shared `Select` exists and `SelectMenu`/old Select are gone;
- priority large components have cohesive responsibility boundaries;
- static constants/mappers are no longer unnecessarily embedded in render bodies;
- unnecessary JSX noise/dead code is reduced without behavioral changes;
- duplicate domain presentation logic has clear canonical ownership;
- broad fragile mocks are reduced;
- module boundaries are cleaner and enforceable;
- full lint/typecheck/test/build passes;
- critical full-stack/cross-app E2E flows are implemented and gated under the separate `E2E_TESTING_STRATEGY_PLAN.md` program;
- a final independent audit finds no unresolved P0 cleanup issues.
