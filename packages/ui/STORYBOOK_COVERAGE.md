# Storybook Coverage

Every public reusable UI component exported by `@pos/ui` must be represented in Storybook. When a new public component is added to `src/index.tsx`, add or update a story in the same change.

## Coverage status

- Primitives: Button, IconButton, Select, Badge, StatusBadge, Card, Spinner, EmptyState, StatCard
- Layout: Container, Grid, Page, PageHeader, Section, Stack
- Forms: TextInput/Input, PasswordInput, SearchInput, TextArea
- Selection: SelectMenu
- Overlays: Dialog, BottomSheet, Popover, DropdownMenu, Tooltip, Toast/Toaster
- Navigation: Breadcrumbs, Tabs, SkipLink
- Data display: Table, DataGrid, Pagination, FilterBar, Toolbar, Skeleton, SkeletonText, SkeletonCard, SkeletonTable
- Feedback/runtime: AppErrorBoundary, ConnectivityBanner
- Theme: ThemeProvider, ThemeSwitcher

Non-component exports such as types, constants, animation tokens, hooks, utilities, and shared helper functions are intentionally excluded from visual Storybook coverage and remain covered by unit/type tests.
