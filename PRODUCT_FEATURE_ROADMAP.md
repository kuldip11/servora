# Servora Product Feature Roadmap

## Purpose

This document captures product-level opportunities for Servora that are worth evaluating after the current pre-production engineering baseline is stable. It is intentionally not an implementation-status document and does not imply that every item should be built. Each initiative should be selected based on customer need, operational value, complexity, and release priority.

Servora already spans POS/admin, kitchen display, waiter operations, customer QR ordering, menu/pricing, payments, inventory, analytics, realtime workflows, tenancy, and RBAC. The strongest next product improvements are therefore not more isolated screens; they are features that make those systems feel like one coherent restaurant operating platform.

## Product principles

Future features should follow these principles:

1. Reduce operational friction for restaurant staff during live service.
2. Make complex system decisions explainable to users.
3. Surface problems before users need to hunt for them.
4. Prefer guided workflows over configuration-heavy screens.
5. Keep multi-branch operations understandable from one place.
6. Preserve server-authoritative pricing, availability, inventory, permissions, and order state.
7. Design realtime and offline behavior as core product behavior, not edge cases.
8. Keep workflows useful for a single restaurant while scaling cleanly to franchises and multi-branch groups.

---

# Priority 1 — First-Run Setup Wizard

## Problem

A new owner has to understand Servora's data model before they can use the product. Organization, franchise, branch, taxes, payments, menu, staff, and kitchen setup are all valid concepts, but exposing them as disconnected configuration screens creates unnecessary friction.

## Goal

Turn first-time setup into a guided journey that gets a restaurant from signup to an operational branch without requiring product knowledge.

## Recommended flow

```text
Account created
  → Organization
  → Franchise / brand
  → Branch
  → Business settings
  → Taxes and service charges
  → Payment configuration
  → Menu setup
  → Staff and roles
  → Kitchen stations
  → Review
  → Ready to operate
```

## UX requirements

- Show progress and completed steps.
- Allow users to leave and resume later.
- Automatically select newly created organization, franchise, and branch context.
- Skip optional steps without blocking setup.
- Explain why each entity exists in plain language.
- Provide useful defaults for common restaurant configurations.
- Prevent users from landing on screens that require setup they have not completed.
- Show a final readiness checklist before completion.

## Suggested readiness checks

- Organization exists.
- Franchise/brand exists when required by the account model.
- At least one branch exists.
- Branch timezone and business day are configured.
- At least one payment method is available.
- At least one menu or menu item is published.
- At least one operational user exists.
- Kitchen routing is configured when KDS is enabled.

## Tests

- Fresh signup with zero organizations.
- Create organization and auto-select it.
- Create franchise after organization creation.
- Create first branch.
- Resume incomplete setup.
- Existing owner with organization but no franchise.
- Existing owner with franchise but no branch.
- Fully configured owner bypasses onboarding and lands on the dashboard.

## Product value

Very high. This directly affects activation, trial conversion, support load, and the first impression of the product.

---

# Priority 2 — Operations Center

## Problem

Operational issues currently originate in different domains: orders, inventory, payments, devices, approvals, menu configuration, and staff activity. If each feature only surfaces its own alerts, an owner or manager must continuously inspect multiple screens.

## Goal

Create one actionable Operations Center that answers: "What needs attention right now?"

## Example issues

```text
3 low-stock ingredients
2 failed payments
4 orders delayed beyond target
1 kitchen display offline
2 manager approvals waiting
1 menu publish conflict
5 inventory variances above threshold
```

## Recommended categories

- Orders
- Kitchen
- Inventory
- Payments
- Devices/connectivity
- Staff approvals
- Menu/publishing
- Customer issues
- Branch configuration

## Behavior

Each issue should include:

- severity
- branch
- detected time
- concise explanation
- recommended action
- direct link to the relevant record/screen
- resolution state
- actor and resolution time when resolved

## Views

- All branches
- Current branch
- Critical only
- Unresolved
- Resolved history
- Category filters

## Product value

Very high for managers and multi-branch owners. It turns Servora from a collection of management screens into an operating console.

---

# Priority 3 — Explainability Layer

## Problem

Servora has sophisticated pricing, menu availability, inventory, permissions, order routing, and audit behavior. If users only see the final outcome, this sophistication can feel unpredictable rather than powerful.

## Goal

For important decisions, make Servora able to answer: "Why did this happen?"

## 3.1 Explain this price

Example:

```text
Base price                    ₹400
Branch override               +₹20
Happy hour                    -₹40
Modifier                      +₹50
Loyalty discount              -₹20
                              -----
Final price                   ₹410
```

The explanation should identify the actual rule or override responsible for each adjustment.

### Use cases

- staff disputes a price
- customer asks why the total changed
- owner verifies a promotion
- branch-specific pricing is unexpected
- support investigates a pricing complaint

## 3.2 Explain availability

Example:

```text
Butter Chicken is unavailable

Reason: Ingredient stock below threshold
Ingredient: Chicken Breast
Source: Inventory availability rule
Branch: Connaught Place
Since: 9:42 PM
```

Possible causes should include:

- manual override
- schedule
- menu membership
- branch override
- inventory dependency
- effective date
- channel restriction
- fulfillment restriction

## 3.3 Explain order state

Example:

```text
Order #1842 is waiting

Current state: Preparing
Blocking item: Tandoori Platter
Kitchen station: Grill
Elapsed at station: 14m
Target: 10m
```

## 3.4 Explain inventory movement

Example:

```text
Chicken Breast decreased by 1.2 kg

Order: #1842
Recipe: Tandoori Platter
Quantity sold: 3
Recipe deduction: 0.4 kg each
Transaction type: Recipe consumption
```

## Product value

Very high. Explainability can become a Servora differentiator because it converts complex backend behavior into confidence for staff, managers, and support teams.

---

# Global Command and Search

## Goal

Add a keyboard-first command interface, typically `Ctrl/Cmd + K`, for fast navigation and entity search.

## Search targets

- orders
- menu items
- customers
- staff
- branches
- tables
- inventory items
- settings
- reports

## Commands

Examples:

- Create order
- Add menu item
- Open today's sales
- Switch branch
- Open low stock
- Create staff member
- Go to kitchen stations

## Requirements

- permission-aware results
- tenant/branch-aware results
- keyboard navigation
- recent commands
- contextual actions where safe

## Product value

High for frequent administrative users and power users.

---

# Action-Oriented Owner Dashboard

## Problem

A dashboard that only reports metrics does not help an owner decide what to do next.

## Goal

Combine business health, operational exceptions, and useful actions on the owner landing page.

## Recommended sections

### Today

- net sales
- order count
- average order value
- refunds/voids
- payment failures
- open orders

### Attention required

- delayed orders
- low stock
- unusual void/refund activity
- offline devices
- unresolved approvals

### Performance

- sales vs previous comparable period
- food cost trend
- preparation-time trend
- top/bottom products
- branch comparison

### Suggested actions

Examples:

- "Chicken stock may run out before dinner peak."
- "Branch B's preparation time is 18% above its 7-day average."
- "Five menu items have not sold in 30 days."

## Product value

High. It makes analytics operational rather than decorative.

---

# Branch Health

## Goal

Give owners a fast view of whether each branch is operating normally.

## Example

```text
Connaught Place       Healthy
Gurgaon Sector 29     2 warnings
Noida Sector 18       KDS offline
```

## Health signals

- API/realtime connectivity
- KDS connectivity
- waiter app connectivity where trackable
- payment provider status
- open critical issues
- delayed-order rate
- inventory alerts
- last successful synchronization

## Branch detail

Clicking health status should explain every warning and provide a direct remediation path.

## Product value

High for franchise and multi-branch operators.

---

# Unified Activity Timeline

## Goal

Expose meaningful operational and administrative activity in a human-readable timeline backed by the existing audit/event architecture.

## Example

```text
10:42 PM  Rahul voided Order #1842
10:38 PM  Menu price changed ₹320 → ₹350
10:20 PM  Inventory adjustment: Chicken -4 kg
09:55 PM  Priya opened register
```

## Filters

- branch
- actor
- entity type
- action type
- time range

## Requirements

- permission-aware visibility
- links to affected entities
- before/after values where useful
- clear distinction between system actions and user actions

## Product value

High for management, investigations, and support.

---

# Menu Management UX Upgrade

## Goal

Make advanced menu capabilities easy enough for everyday restaurant operators.

## Recommended improvements

- duplicate item
- bulk edit
- bulk publish/unpublish
- branch override indicators
- scheduled change indicators
- effective-date preview
- customer-facing preview
- branch preview
- channel preview
- conflict warnings before publish
- unsaved change protection
- recent changes panel

## Preview mode

A particularly valuable feature would allow an owner to preview:

```text
Branch: Gurgaon
Channel: Customer QR
Fulfillment: Delivery
Date/time: Friday 7:30 PM
```

Servora should then render the menu exactly as the customer would see it under that context.

## Product value

High because the existing menu model is powerful and should be easier to understand visually.

---

# Menu Draft, Review, and Publish Workflow

## Problem

For larger operations, immediate activation of administrative changes increases risk.

## Goal

Support controlled menu changes.

## Workflow

```text
Draft
  → Review
  → Approved
  → Publish now / Schedule
  → Live
```

## Optional controls

- require approval for specific roles
- scheduled publication
- change summary before publish
- affected branches/channels preview
- validation/conflict checks
- rollback to previous published revision

## Important design constraint

This should be optional. Small restaurants should still be able to operate with a simple edit-and-publish flow.

## Product value

Medium to high depending on target customer size.

---

# Order Timeline

## Goal

Provide a complete operational history for each order.

## Example

```text
8:02 PM  Created by waiter
8:03 PM  Sent to kitchen
8:03 PM  Pizza routed to Pizza station
8:11 PM  Pizza marked ready
8:12 PM  Waiter notified
8:14 PM  Served
8:36 PM  Payment initiated
8:37 PM  Paid via UPI
```

## Timeline events

- creation
- item additions/removals
- kitchen routing
- preparation transitions
- refires/refills
- waiter notifications
- voids/comps
- payment attempts
- refunds
- bill actions
- completion/cancellation

## Product value

Very high for support, restaurant managers, and dispute resolution.

---

# KDS Performance and Station Intelligence

## Goal

Turn KDS data into measurable kitchen performance.

## Metrics

- average preparation time
- median preparation time
- overdue ticket count
- station workload
- active ticket count
- peak periods
- items frequently exceeding targets
- station-to-station bottlenecks

## Live station view

Example:

```text
Grill      12 active   Avg 11m   4 overdue
Pizza       6 active   Avg 8m    0 overdue
Dessert     3 active   Avg 5m    0 overdue
```

## Product value

High for restaurants with meaningful kitchen volume.

---

# Waiter Workload and Service Queue

## Goal

Help waiters understand what requires attention without repeatedly scanning every table.

## Example

```text
My tables               7
Need attention           3
Ready to serve           2
Payment requested        1
```

## Attention reasons

- food ready
- customer assistance requested
- payment requested
- table idle unusually long
- order not submitted
- kitchen delay

## Product value

High for table-service restaurants.

---

# Customer Ordering Continuity

## Goal

Make QR ordering resilient and natural across multiple rounds of dining.

## Requirements

- persistent session after refresh
- persistent cart when appropriate
- clear separation of cart items and already-submitted items
- multiple rounds of ordering
- live order status
- bill/payment status
- multiple guests at one table
- conflict-safe simultaneous ordering
- waiter assistance request
- clear handling when a menu item becomes unavailable mid-session

## Product value

Very high if customer QR ordering is a core Servora channel.

---

# Notification Center

## Problem

Transient toast messages are insufficient for important operational events.

## Goal

Create persistent, actionable notifications shared across relevant Servora apps.

## Notification types

- order ready
- payment failed
- refund completed/failed
- low inventory
- table assistance requested
- branch device disconnected
- manager approval required
- menu publish completed/failed
- scheduled menu change activated

## Requirements

- read/unread state
- severity
- branch context
- deep links
- permission-aware delivery
- expiration rules for stale notifications
- realtime updates

## Product value

High, especially when combined with the Operations Center.

---

# Offline and Reconnection Experience

## Goal

Make connectivity state explicit in every operational application.

## User states

```text
Online
Reconnecting…
Offline
Connection restored
```

## Requirements

Each application should define what users can safely do while offline rather than showing a generic connection message.

Examples:

- KDS should clearly distinguish cached tickets from live state.
- Waiter app should not silently lose order actions.
- POS should prevent unsafe payment/order operations when server authority is required.
- Customer app should preserve local state and explain when submission cannot proceed.

## Future direction

A later phase may support controlled offline queues for specifically designed idempotent operations, but offline writes should never be introduced generically.

## Product value

Very high for real restaurant environments where connectivity is imperfect.

---

# Business Day Configuration

## Problem

Restaurant accounting often does not align with midnight-to-midnight calendar days.

## Goal

Allow each branch to define its operational business-day boundary.

## Example

```text
Business day: 6:00 AM → 5:59 AM next day
```

An order at 1:30 AM on Saturday may therefore belong to Friday's business day.

## Areas affected

- dashboard metrics
- sales reporting
- shift reports
- settlement reports
- inventory reporting
- daily comparisons
- exports

## Product value

Very high for production POS/reporting correctness.

---

# Register and Shift Lifecycle

## Goal

Support complete cashier/register accountability.

## Workflow

```text
Open shift
  → Enter opening cash
  → Process transactions
  → Record cash in/out
  → Close shift
  → Count actual cash
  → Compare expected vs actual
  → Manager review if required
```

## Data to track

- operator
- register/device
- branch
- opening balance
- cash sales
- cash refunds
- cash movements
- expected closing balance
- actual closing balance
- variance
- close time

## Product value

Very high if Servora is intended to function as a full production POS rather than only order management.

---

# Manager Approval Workflows

## Goal

Require explicit manager authorization for sensitive actions based on tenant policy.

## Candidate actions

- high-value discount
- void after preparation
- refund
- inventory write-off
- bill reopen
- complimentary item
- excessive manual price adjustment
- shift variance approval

## Authorization methods

Depending on the deployment model:

- manager login/session
- approval request to manager device
- manager PIN with secure server-side validation

## Requirements

- threshold configuration
- role configuration
- immutable approval evidence
- requester and approver separation
- audit trail
- clear declined/pending states

## Product value

High for loss prevention and operational governance.

---

# Actionable Analytics and Insights

## Problem

Charts report what happened but often leave interpretation to the owner.

## Goal

Add generated operational insights that explain meaningful changes using Servora's own data.

## Examples

Instead of:

```text
Revenue +12%
```

show:

```text
Revenue is up 12%, driven mainly by Friday dinner traffic at Branch A.
```

Instead of:

```text
Food cost +6%
```

show:

```text
Food cost increased 6%. Chicken usage exceeded recipe expectations by 11% and accounts for most of the variance.
```

## Insight categories

- sales movement
- branch anomalies
- preparation performance
- inventory variance
- item profitability
- promotion performance
- customer ordering behavior
- staffing/operational patterns when enough data exists

## Requirements

- every insight must be traceable to underlying metrics
- avoid unsupported causal claims
- show comparison period
- allow users to inspect the supporting data

## Product value

High after Servora has sufficient production data.

---

# Multi-Branch Comparison Workspace

## Goal

Provide franchise/group operators with one place to compare branch performance and operational health.

## Comparison dimensions

- sales
- order volume
- average order value
- preparation time
- refunds/voids
- inventory variance
- food cost
- payment failure rate
- menu availability
- branch health

## Requirements

- normalized comparison periods
- configurable business day
- same-store comparisons where relevant
- ability to drill into the selected branch

## Product value

High for multi-branch customers; lower priority for single-location launch customers.

---

# Device and Terminal Management

## Goal

Give administrators visibility and control over operational devices connected to Servora.

## Device types

- POS terminals
- KDS screens
- waiter devices/sessions
- printers where integrated later
- customer display devices where integrated later

## Information

- branch
- device name
- device type
- last seen
- app/version
- online state
- assigned station/register
- current authenticated operator when appropriate

## Product value

Medium initially, high as production deployments scale.

---

# Recommended sequencing

## Product Wave 1 — Activation and operational trust

1. First-run setup wizard
2. Business day configuration
3. Order timeline
4. Explainability layer
5. Offline/reconnection UX

These solve onboarding and day-to-day trust issues that matter before adding more management sophistication.

## Product Wave 2 — Operations management

1. Operations Center
2. Action-oriented owner dashboard
3. Notification Center
4. Branch health
5. Waiter workload/service queue
6. KDS performance and station intelligence

These turn existing Servora domain data into better restaurant operations.

## Product Wave 3 — Control and scale

1. Register/shift lifecycle
2. Manager approvals
3. Menu draft/review/publish
4. Multi-branch comparison
5. Device management
6. Actionable analytics

These are particularly important for larger restaurants and multi-branch organizations.

## Product Wave 4 — Productivity polish

1. Global command/search
2. Menu management UX upgrades
3. Customer ordering continuity improvements beyond the launch baseline
4. Additional automation and insights based on real production usage

---

# Selection framework for later planning

Before implementing any item, score it against:

| Dimension            | Question                                                                    |
| -------------------- | --------------------------------------------------------------------------- |
| Customer value       | Does this solve a frequent real restaurant problem?                         |
| Operational impact   | Does it reduce mistakes, delays, or manual work?                            |
| Revenue impact       | Does it improve activation, retention, upsell, or transaction volume?       |
| Breadth              | How many Servora customer types benefit?                                    |
| Dependency readiness | Does the current backend/domain model support it cleanly?                   |
| Complexity           | How much cross-app/database/realtime work is required?                      |
| Risk                 | Could failure affect orders, payments, inventory, or reporting correctness? |
| Evidence             | Do customer interviews/production usage support the need?                   |

A feature should move from this roadmap into an implementation plan only after its scope, dependencies, data model, UX, failure modes, tests, and acceptance criteria are explicitly defined.

---

# Current recommendation

When Servora is ready to resume product feature work, start with these three initiatives:

1. **First-run setup wizard** — improves activation and removes setup dead ends.
2. **Operations Center** — gives owners and managers a single actionable view of live problems.
3. **Explainability layer** — makes pricing, availability, orders, and inventory transparent and can become a clear product differentiator.

The rest of this document should remain a product backlog until real customer feedback or production usage justifies prioritization.
