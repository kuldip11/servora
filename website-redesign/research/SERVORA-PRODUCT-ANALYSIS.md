# Servora: product evidence from source

1 November 2026. Evidence comes from application routes, component implementations, API handlers, contracts and schema in the restored cleanup source. No README, old website copy or prior design report was used to establish capabilities. Implemented code is evidence of implementation, not proof that a production account, payment credential or deployment is operational.

## Product and audience

Servora provides four connected application surfaces for restaurant operations. The strongest evidenced use case is a table-service restaurant where orders, preparation, ready food, guest requests and billing need shared context. Counter/takeaway order types and multi-branch entities also exist. These support secondary scenarios; they do not prove fit for every restaurant format, hotel, franchise contract or enterprise requirement.

| Workspace | Observed implementation | Primary user |
| --- | --- | --- |
| `apps/web` | Permission-gated business, orders, tables, billing, menus, availability, inventory, staff and reporting routes | Manager, owner and authorized front-of-house staff |
| `apps/kitchen-display` | Station filter, grouped kitchen queue, ticket detail and status mutation, urgent/void feedback, reconnect/stale-data handling | Kitchen staff |
| `apps/waiter-app` | Home attention queue, active orders, guest requests, menu ordering, add-to-order, profile | Floor team |
| `apps/customer-app` | QR-token session, menu/search/categories, item/combo customization, cart, order tracking, service requests and checkout | Guest |

Entry evidence: `apps/web/src/routes/index.tsx`, `apps/kitchen-display/src/features/kitchen/pages/KitchenBoard.tsx`, `apps/waiter-app/src/app/router.tsx`, `apps/waiter-app/src/features/home/pages/HomePage.tsx`, `apps/customer-app/src/CustomerApp.tsx`.

## Verified capability map

| Capability | Evidence | Marketing treatment |
| --- | --- | --- |
| Table and takeaway orders | `apps/api/src/modules/orders/order.route.ts`, order creation/fire services, order contracts; management and waiter order screens | Core story: capture the order and retain its operational context |
| Kitchen execution | `modules/kitchen-tickets/ticket.route.ts`; station query and status patch; `TicketCard`, `KitchenBoard`, `STATUS_CONFIG` | Dedicated product page; show actual ticket UI and valid states, including internal `FIRED` terminology mapped by the app |
| Waiter attention | Waiter `HomePage` derives ready tickets, bill-requested orders and customer requests; order/menu routes | Dedicated page: ready food, requests and table ordering; not staff scheduling or payroll |
| QR ordering | Customer `/sessions`, `/menu`, `/orders`, `/orders/:id`; `x-customer-session` header and QR token; customer menu/card/customization source | Dedicated page; actual access depends on restaurant/table session, not a universal public menu link |
| Menu control | Registered item/category/modifier/menu/availability/combo routes and management menu screens | Explain choices and availability; do not imply every modifier is universally enabled |
| Billing and splits | Billing routes expose collection/refund, even/item/seat splitting and seat shares; billing service permissions and money validation | Demonstrate bill structure and split options; no claimed tax certification or payment guarantee |
| Payments | Customer takeaway initiation/verification and `razorpay-client.ts` call a configured gateway; webhook ingest/worker source | Implementation exists, but credentials and live money movement were not tested. Do not display unverified provider logos or promise all processors |
| Stock and recipes | Inventory routes/repositories, recipe resolution/cost/deduction services and management inventory page | Secondary management story; no quantified waste/margin claim |
| Reporting | Analytics endpoints and management dashboard/menu-engineering/branch-health routes | Explain access to operational reports; no fabricated uplift chart or claimed prediction engine |
| Branch context | Branch/tenant/organization endpoints, schema and management business/context selection | Explain selecting/managing branch context; no unsupported franchise or global compliance claims |
| Staff access | Staff/role/permission endpoints, auth authorization and route permission gates | Explain role-based responsibilities; no claim of external security certification |

The API registers these modules in `apps/api/src/index.ts`; definitions alone were cross-checked with relevant handlers and frontend consumers. Database table structure and request/response contracts constrain the sample fixtures used in visuals.

## Connected workflow to demonstrate

1. A guest enters through a QR session tied to restaurant/table context, or a member of staff takes an order.
2. Choices, quantities and notes enter the order record. Kitchen work is fired and presented through kitchen ticket states.
3. The kitchen advances preparation; ready tickets are visible in the waiter's attention view.
4. The floor team responds to ready food and guest/bill requests. Billing produces the settlement record and supported split allocations.
5. Management maintains the menu and operational context around that flow, including branch, stock and staff permissions.

This is a product narrative, not a claim that marketing demonstration controls send real orders. Every interactive sample must say it runs locally with illustrative data.

## Actual UI evidence

Product visuals should use the existing `TicketCard`/header/items/footer, customer `MenuCard`, waiter `OrderCard` and management `OrderFinancialSummary` with source-conforming fixtures. Rendering these components in a small isolated capture harness preserves their actual markup and design. Sample data and fixture callbacks must be identified explicitly. They are component captures, not authenticated production screenshots. No operational app code needs modification to generate them.

## Availability boundaries

- No live database/restaurant test account was used. A working source implementation does not establish production onboarding readiness.
- Razorpay code requires configuration; a payment enum is not proof of another provider integration.
- No verified offline order synchronization, proprietary hardware bundle, delivery-aggregator integration catalogue, 24/7 support guarantee, certification or customer outcome is available for marketing.
- Customer/loyalty/promotion modules exist, but broad CRM automation and enterprise marketing claims are not established by that fact.
- Legal policies are existing launch placeholders and remain non-indexable until approved content is provided. Pricing and commercial terms are not established by application source.

## Technical contracts to preserve

The website is Next.js App Router/React/TypeScript/Tailwind. `app/api/lead/route.ts` validates, rate-limits and relays leads through `LEAD_WEBHOOK_URL`; forms must preserve the payload and honest failure states. `lib/app-urls.ts` resolves application destinations. Login redirect and consent-aware `lib/analytics.ts` event names remain compatible. Existing canonical/social/schema/robots/sitemap helpers must be retained or deliberately migrated.

No `QueryClient`, `useQuery` or `useMutation` was found in the restored marketing website. Its forms use POST and its demonstrations use local React state. TanStack guidance therefore means preserving that boundary, not adding a query cache to static marketing pages. Operational query/cache/realtime behavior is out of scope for changes.
