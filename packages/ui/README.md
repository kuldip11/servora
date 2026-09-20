# @pos/ui

`@pos/ui` is Servora's shared React design-system package. Operational applications should prefer these primitives over app-local copies so interaction behavior, accessibility, spacing, and theme semantics stay consistent.

## Component groups

### Foundations

- Theme provider and theme tokens
- Animation tokens and reduced-motion support
- `cn` class-name helper

### Actions and status

- `Button`
- `IconButton`
- `Badge`
- `StatusBadge`
- `Spinner`
- `StatCard`
- `EmptyState`
- `Card`

### Forms

- `TextInput`
- `TextArea`
- `PasswordInput`
- `SearchInput`
- `Select`
- `SelectMenu`

### Overlays

- `Dialog`
- `BottomSheet`
- `Popover`
- `DropdownMenu`
- `Tooltip`
- `Toast` / `Toaster`

### Navigation and layout

- `Breadcrumbs`
- `Tabs`
- `SkipLink`
- `Page`
- `PageHeader`
- `Container`
- `Section`
- `Stack`
- `Grid`

### Data display

- `Table`
- `DataGrid`
- `Toolbar`
- `FilterBar`
- `Pagination`
- `SkeletonLoader`

## Design-system rules

1. Use semantic theme tokens instead of application-specific literal colors where a token exists.
2. Preserve keyboard interaction and visible focus states.
3. New shared components require behavior tests, not only snapshots.
4. Prefer composition over adding one-off variants for a single feature.
5. Keep domain/business rules outside this package.
6. Breaking interaction changes must be checked across Web, Waiter, Kitchen, Customer, and Website consumers.

## Verification

```bash
cd packages/ui
bun run typecheck
bun run test
bun run test:coverage
```

A visual component explorer such as Storybook is a useful future enhancement, but it should only be added together with a committed lockfile update and CI verification rather than as unverified configuration.

## Storybook coverage policy

Storybook is the visual documentation surface for every public reusable component exported by `@pos/ui`. The current coverage inventory is tracked in [`STORYBOOK_COVERAGE.md`](./STORYBOOK_COVERAGE.md).

When adding a new public component:

1. export it from `src/index.tsx`;
2. add representative Storybook states in `src/stories/`;
3. update `STORYBOOK_COVERAGE.md` in the same change;
4. run `bun run --filter @pos/ui storybook:build` before merging.

Generated `storybook-static/` output is intentionally ignored and must not be committed.
