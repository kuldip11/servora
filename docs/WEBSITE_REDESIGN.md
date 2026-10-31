# Servora marketing website redesign

Implemented 2026-11-01, against cleanup source commit `c1f18b8`. The pre-change local apps/packages blobs were checked against that commit and matched. Product documentation was not used as capability evidence.

## Product and design

Servora has management/POS, waiter, kitchen and customer QR applications. The inspected routes and contracts support table-aware orders, menu choices and availability, kitchen stations/ticket states, bills and splits, staff access, inventory/recipes and branch-aware reports. A payment-provider enum was not treated as evidence of a working integration. No customer testimonials, outcomes, addresses, fixed prices or deployment guarantees were invented.

The independent visual direction is Taste's **The well-kept board**, seed **1315166700**: dense filled compositions, dark forest fields, white product surfaces, lime actions, square geometry and self-hosted League Spartan/Figtree. One palette redraw replaced a warm neutral/green palette too close to the discarded design. Servora's table-aware order and four workspaces become the service board. Interface fragments are code-built from inspected product concepts and explicitly labeled as illustrative sample data; they are not captured production screenshots.

## Scope and implementation

- New homepage, navigation, mobile disclosure menu, footer and conversion sections.
- New product overview and all ten existing feature pages plus a dedicated waiter-app page; separate portrait, split and wide compositions for different workflows.
- New app directory, pricing scope worksheet, contact and demo-request layouts, legal presentation, 404 and error states. Login retains its configured redirect.
- New `components/site/ProductSurface.tsx` and small compositional page primitives. Existing metadata adapter, canonical policy and schema helpers are preserved.
- New typography, spacing, surfaces, responsive layouts, visible focus and reduced-motion styling in website CSS.
- Rebuilt favicon, application icons and OG/Twitter artwork for the new visual identity. `scripts/website/generate-brand-assets.mjs` reproduces the vector-based artwork using Next's installed Sharp dependency. Font licences are included under `public/fonts`.
- Interactive demonstrations retain local working interactions and dynamic imports, with clearer sample labeling, loading and chunk-error states. Customer search now filters actual sample dishes. Selected extras, quantity and cart values reconcile; management overview totals derive from sample order records rather than unrelated growth metrics.
- Existing lead validation, anti-spam controls, POST contract, webhook behavior and consent-aware analytics remain intact. No backend or operational app source was changed.

## Skills applied

| Required skill              | Application                                                                                                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Taste Skill                 | Installed by the requested project installer at `.agents/skills/design-taste-frontend/SKILL.md`; direction drawing, copy argument, interface treatment and static lint used.     |
| Vercel React Best Practices | Static marketing remains server-rendered; interactive demo chunks are lazy; no new runtime data library; local fonts avoid an external font request.                             |
| Vercel Composition Patterns | Page primitives compose content; interface surfaces use an explicit kind; feature layouts have explicit variants rather than multiplying boolean props.                          |
| TanStack Query Guidance     | Verified no QueryClient/useQuery/useMutation in this website. Local demos stay local; forms keep their existing POST flow. Operational app query caches/contracts are untouched. |
| SEO Audit                   | Before/after route inventory, one main/H1, internal links, content accuracy, indexability and sitemap parity reviewed.                                                           |
| React SEO Skills            | Next metadata, complete social defaults, canonical paths, JSON-LD serialization, sitemap and robots retained. Social artwork updated with the implementation.                    |

## Validation and limits

- Website production build: passed, including Next type/lint validation, with explicit CI fixture URLs.
- Website tests: 30 passed, including customer extras/quantity/cart reconciliation and empty-search regression cases.
- Standalone website TypeScript and ESLint: passed.
- Generated SEO audit: passed for all 17 indexable pages, including canonicals, sitemap parity, social metadata, landmarks and JSON-LD parsing.
- Source SEO and metadata-image asset checks: passed.
- Taste static lint of marketing shell/pages: zero failures; one aggregate em-dash warning across page metadata. Product data-row rules and floating menu/dialog shadows have documented exceptions.
- Desktop/tablet/mobile regression tests added for 1440/768/390px, mobile menu keyboard behavior and route fit. Browser execution is not claimed as passed.

**Rendered visual review is pending.** Local Chromium installation was attempted. A downloaded Chromium 140 binary can report its version but exits with SIGTRAP when rendering, including a trivial local HTML document. Playwright and Taste's inspector consequently could not run. The cloud browser cannot reach the local server. Its attempt to open the existing protected preview redirected toward Vercel authentication and was rejected by automatic approval review because broad account-origin access was not authorized. No browser screenshot or visual score was fabricated, and no access-control protection was disabled.

The intended screenshot/axe pass covers every public route at desktop, tablet and mobile widths, then interactive workflows and forms. That pass and refinement must finish before calling the design visually signed off. Existing CI browser acceptance remains available once the branch is pushed; no remote CI result is claimed here.

Approved legal copy, actual pricing/commercial terms and customer evidence remain external inputs. The existing legal placeholders remain noindex. No production release is part of this redesign change.
