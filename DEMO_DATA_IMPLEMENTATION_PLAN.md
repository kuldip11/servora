# Servora Demo Data Implementation Plan

## Goal

Provide deterministic, resettable demo data that exercises Servora's real Organization → Franchise/Tenant → Branch hierarchy and creates underlying transactions used by dashboards and analytics.

## Architecture

The seeder is intentionally split by domain instead of using one generic SQL/JSON generator:

1. `seed-org.ts` — demo login, organization, franchise tenants, branches, RBAC memberships and staff.
2. `seed-tables.ts` — restaurant tables and branch kitchen stations.
3. `seed-menu.ts` — published menus, categories, realistic menu items, variants, modifiers and routing.
4. `seed-customers.ts` — customer profiles, loyalty tiers and promotions.
5. `seed-inventory.ts` — branch inventory, waste reasons and opening stock movements.
6. `seed-orders.ts` — historical/live orders, KDS tickets, replay-safe order items, bills, payments, promotion redemptions and order status history.
7. `verify.ts` — post-seed integrity/coverage assertions.
8. `reset.ts` — demo-only cleanup, including handling append-only audit-log triggers before tenant deletion.

## Presets

- `small`: 4 concepts × 2 branches, 40 menu items/brand, 30 days of orders. Intended for first validation.
- `demo`: 4 concepts × 6 branches, 160 menu items/brand, 365 days of orders. Intended for customer demos.
- `stress`: 4 concepts × 12 branches, 180 menu items/brand, 365 days at higher traffic. Intended for performance testing.

## Restaurant concepts

- Bean & Brew Cafe
- The Copper Barrel gastropub/bar
- Saffron Route full-service restaurant
- Urban Grill Express QSR

## Safety

Demo reset is disabled when `NODE_ENV=production`. Only the organization named `Servora Demo Group` and the dedicated demo login are targeted.

## Commands

```bash
bun run db:migrate
bun run demo:seed -- --preset=small
bun run demo:reset
bun run demo:seed -- --preset=demo
```

Demo login after a successful seed:

- Email: `demo@servora.local`
- Password: `ServoraDemo@2026`
