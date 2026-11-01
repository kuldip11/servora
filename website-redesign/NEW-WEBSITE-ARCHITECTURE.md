# Website architecture

The journey is **restaurant need → relevant workspace → inspect/try → discuss fit**. Existing useful URLs are retained as an SEO migration decision, not as a design template.

| Route                                                                                 | Purpose                                                                                                                                 |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                                                                   | Name the restaurant POS category, show substantial actual UI, explain the service handoff and offer product exploration/demo conversion |
| `/product`                                                                            | Guide visitors through four workspaces and the management capabilities behind them                                                      |
| `/product/pos-and-orders`                                                             | Order creation, choices, table context and kitchen/billing handoff; split composition                                                   |
| `/product/kitchen-display`                                                            | Station queue, ticket details and valid state transitions; wide composition                                                             |
| `/product/waiter-app`                                                                 | Ready food, guest requests and table ordering; narrow attention view                                                                    |
| `/product/qr-ordering`                                                                | QR/session context, menu choices, cart and tracking; narrow guest view                                                                  |
| Existing menu, billing, inventory, staff, analytics, multi-branch and security routes | Distinct task-specific depth with verified implementation boundaries                                                                    |
| `/demo`                                                                               | Clearly labeled local playground with ordering/customization/cart, kitchen states, floor views and management context                   |
| `/pricing`                                                                            | Setup scope and commercial enquiry; no invented rates or tier promises                                                                  |
| `/book-a-demo`, `/contact`                                                            | Existing validated lead submission with focused layouts and honest delivery states                                                      |
| `/apps`, `/login`                                                                     | Utility application access and existing configured sign-in redirect                                                                     |
| `/legal/*`                                                                            | Readable existing noindex launch placeholders pending approved policies                                                                 |
| Error/404/loading                                                                     | Consistent shell and accessible recovery actions                                                                                        |

Primary navigation: Product, Try the workflow, Pricing, Contact, Request a demo; Sign in is a utility. Product discovery groups workspaces and management features. Footer application links remain accessible without competing with product education.

Detail pages link to adjacent workflows: POS → kitchen/billing; kitchen → waiter/POS; guest → menu/POS; inventory → menu/reporting. Important pages are within three clicks. Add waiter and demo routes to metadata and sitemap registration. Preserve canonical/social/schema/robots machinery and application URL resolution.

Static content and metadata remain server-rendered. Client islands handle navigation, tour/lightbox, local playground, forms and consent/analytics. No new query library or backend contract. Operational applications and their query/realtime caches remain unchanged.
