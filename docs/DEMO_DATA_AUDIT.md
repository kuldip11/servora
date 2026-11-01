# Demo data audit and implementation

Audited against `develop` after the merge of `main`. The former `seed-demo-data` branch was used as a recovery source, not merged wholesale. No application database was seeded or reset during this work.

## Findings and corrections

| Finding                                                                                                 | Correction                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Current seed was a no-op; reset command referenced a missing file                                       | Restored both CLI entry points and the small/demo generators                                                                                    |
| Reset matched an organization name and deleted users by email suffix                                    | Match reserved deterministic IDs and exact identities; preserve unrelated organizations with the same name and users with the same email suffix |
| Reset temporarily disabled the immutable audit-delete trigger globally                                  | Removed trigger changes. Refuse resets with existing immutable demo audit history; roll back without deleting anything                          |
| Seed/reset stages committed independently                                                               | One transaction and a shared transaction-level advisory lock for the full operation; failures preserve the previous complete dataset            |
| Large resets repeatedly scanned foreign-key columns                                                     | Add migration `0080_create_order_graph_indexes` and matching schema indexes; preserve constraints and atomic cleanup                            |
| Tenant cascade could fail on order/menu restrictions                                                    | Explicitly remove dependent payment/stock/order/combo records before deleting demo tenants                                                      |
| Owner account survived the old suffix cleanup and broke a second seed                                   | Exact demo owner and generated staff cleanup, with non-demo membership checks                                                                   |
| Reported stock disagreed with transactions; recipes were missing despite enabled deduction              | Add branch recipes, historical deduction records and a reconciled chronological stock ledger                                                    |
| Synthetic orders used inconsistent live prices, financial totals and item names                         | Reuse the catalog specification and the application's tax/service/rounding calculation; complete bill/payment/refund graphs                     |
| Live table status disagreed with active orders                                                          | Occupy the six active tables; leave representative reserved, cleaning, available and inactive tables                                            |
| QR orders and guest requests lacked session context                                                     | Add real session relations, current expiry and water/bill requests linked to their orders                                                       |
| Most menu items were unavailable; food flags/categories were arbitrary                                  | Keep most catalog items active, assign relevant categories/food flags, retain explicit unavailable/hidden/seasonal/discontinued examples        |
| Add-ons were attached indiscriminately                                                                  | Attach food add-ons to food items; include regular/large variants, a two-slot combo and illustrative allergen links from the demo recipes       |
| Host timezone changed historical order dates and the random helper could produce an invalid upper index | Generate Indian restaurant dayparts independently of host timezone and use random values in `[0,1)`                                             |
| No checks established demo correctness                                                                  | Add unit controls and opt-in PostgreSQL lifecycle tests; run financial, stock, chronology and scope checks before commit                        |

## Supported workflow

Run these from the repository root against the intended development/demo database:

```bash
bun run db:migrate
bun run demo:seed -- --preset=small
bun run demo:reset
bun run demo:seed -- --preset=demo
```

`bun run db:seed` uses the small preset by default. `demo:seed` replaces the previous generated dataset atomically. `demo:reset` removes demo operational records and accounts while preserving schema, migrated RBAC/allergens and unrelated records. No database-level reset or trigger bypass is used.

| Property                   | small | demo |
| -------------------------- | ----- | ---- |
| Restaurant concepts        | 4     | 4    |
| Branches per concept       | 2     | 3    |
| Total branches             | 8     | 12   |
| Historical days            | 30    | 90   |
| Baseline orders/branch/day | 5     | 14   |
| Active orders per branch   | 6     | 6    |
| Menu items per concept     | 40    | 80   |
| Customers per concept      | 80    | 500  |
| Tables per branch          | 10    | 16   |
| Inventory items per branch | 24    | 32   |
| Staff per branch           | 4     | 8    |

Weekend volume is higher, so order totals depend on the reference date. The full preset is a usable demonstration dataset rather than the old 365-day/24-branch stress-sized default. The existing conservative small-preset estimate remains below its 250 MB budget; that estimate is not a measurement of actual database size.

The four fictional concepts are Bean & Brew Cafe, The Copper Barrel, Saffron Route and Urban Grill Express. The owner is `demo@servora.local`, with local-development default password `ServoraDemo@2026`; `DEMO_PASSWORD` overrides it. Staff use the same configured password and generated emails listed in the users table. The CLI does not print a configured password.

For a reproducible historical clock:

```bash
bun run demo:seed -- --preset=small --as-of=2026-11-01T12:00:00Z
```

Use a current reference time for an interactive demo so guest sessions remain current. IDs and generated scenarios are deterministic; password hashes intentionally use bcrypt's random salt.

## Boundaries

- Production `NODE_ENV` is rejected before mutation.
- Existing demo audit rows remain append-only. Seed/reset refuses that dataset; use a fresh disposable demo database rather than disabling audit protections.
- No payment gateway, email, SMS or external service is called. Payment method fixtures represent schema states, not live integrations.
- Recipes, ingredient costs and allergen links are fictional demo fixtures, not approved recipes or dietary guidance for a real restaurant.
- Station routing in the application currently permits one default route per tenant-level item, rather than a branch-specific route. The seed leaves shared-menu default routes unassigned, which KDS supports, so it does not pin new orders from other branches to the first branch. Generated historical/live ticket items use their own branch’s stations. The broader application-model limitation is not changed by the seed work.
- These datasets cover core demo workflows and representative states; they are not exhaustive fixtures for every advanced pricing, approval, guided-builder, seat-split or scheduling configuration.

## Verification

```bash
DEMO_TEST_DATABASE_URL=postgresql://... bun run test:demo:postgres
```

The test command requires an explicitly selected disposable PostgreSQL URL and never falls back to `DATABASE_URL`. It migrates and drops its own isolated test schema. Tests cover both presets, repeat seeding/reset, rollback, unrelated data preservation, reference-data preservation and audit immutability. The verification stage checks catalog/operational state coverage and reconciliation before the transaction is committed.

Local database verification uses an isolated PostgreSQL-compatible PGlite engine with the real Postgres.js driver and canonical Drizzle migrations. PGlite tooling lives outside the application dependency graph. Native PostgreSQL concurrency behavior is not established by that local run; the opt-in test suite can run against a native disposable PostgreSQL instance.

### Completed local checks

- API TypeScript check, targeted lint and formatting: passed.
- Seed controls and database lifecycle: 12 tests passed, including both complete presets, repeated seeding, repeated reset, rollback, unrelated-record preservation and immutable audit history.
- Related billing, kitchen, inventory and recipe schema tests: 17 passed.
- Index-only migration validation guards: 4 passed; reject unrelated/destructive SQL, metadata mismatch and undeclared schema changes.
- Migration integrity: all 81 SQL/journal/snapshot units passed. The validator now explicitly supports strictly additive index-only units and verifies that their entire snapshot delta matches their SQL.
- Production CLI guard and explicit test-database requirement: passed. The CLI source was bundled for Node for the production-guard check; the documented Bun shell sequence was not run against an application database.

The final full lifecycle run completed in about 89 seconds on the isolated WASM PostgreSQL-compatible engine. This includes multiple seeds/resets and is not a native PostgreSQL performance benchmark. No live database, gateway or external messaging service was touched.
