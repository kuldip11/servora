# Servora SEO Implementation Status

**Source plan:** `docs/SERVORA_SEO_IMPLEMENTATION_PLAN.md`  
**Scope:** Website, Web/Business, Waiter, Kitchen, Customer  
**Status legend:** `PENDING` · `IN PROGRESS` · `COMPLETED` · `BLOCKED`

| Phase | Scope | Status |
| --- | --- | --- |
| SEO-1 | Shared `@pos/seo` foundation | COMPLETED |
| SEO-2 | Search-indexing safety | COMPLETED |
| SEO-3 | Favicon and brand assets | COMPLETED |
| SEO-4 | Social / Open Graph system | COMPLETED |
| SEO-5 | Website metadata consolidation | COMPLETED |
| SEO-6 | Structured-data hardening | COMPLETED |
| SEO-7 | On-page product SEO | COMPLETED |
| SEO-8 | Automated SEO audit and CI | COMPLETED |
| SEO-9 | Production verification | BLOCKED — requires deployment |

## Tracking details

### SEO-1 — Shared foundation — COMPLETED
- [x] Created `packages/seo` as framework-neutral `@pos/seo` workspace.
- [x] Added app identity registry for Website, Business, Waiter, Kitchen and Customer.
- [x] Added shared robots/indexing policies.
- [x] Added social image dimensions and brand asset constants.
- [x] Added schema builders.
- [x] Added URL/canonical validation helpers.
- [x] Connected the Next.js website SEO adapter to `@pos/seo`.
- [x] Added unit coverage for app policy, route policy, schema and validation.

### SEO-2 — Search-indexing safety — COMPLETED
- [x] Web: robots meta + deployment-wide `X-Robots-Tag`.
- [x] Waiter: robots meta + deployment-wide `X-Robots-Tag`.
- [x] Kitchen: robots meta + deployment-wide `X-Robots-Tag`.
- [x] Customer: robots meta + deployment-wide `X-Robots-Tag`.
- [x] Added operational-app `robots.txt` files.
- [x] Placeholder legal pages explicitly noindex.
- [x] Login and placeholder legal pages excluded from sitemap policy.
- [x] Website remains the only search-indexable Servora frontend.

### SEO-3 — Favicon and brand assets — COMPLETED
- [x] Created canonical Servora master mark and horizontal/square logo sources.
- [x] Created SVG + ICO favicon family.
- [x] Created 180px Apple touch icon.
- [x] Created 192px, 512px and maskable 512px icons.
- [x] Deployed the same favicon family to all five apps.
- [x] Wired favicon/icon metadata in Website.
- [x] Wired favicon links in all Vite apps.
- [x] Added asset synchronization script so runtime copies are generated from canonical sources.
- [x] Expanded Website manifest with theme/background colors and maskable icon support.

### SEO-4 — Social / Open Graph system — COMPLETED
- [x] Designed and created Website OG card.
- [x] Designed and created Business/Web OG card.
- [x] Designed and created Waiter OG card.
- [x] Designed and created Kitchen OG card.
- [x] Designed and created Customer OG card.
- [x] Exported all static cards at 1200×630.
- [x] Added static Website fallback OG asset.
- [x] Retained/refined dynamic page-specific Website OG generation.
- [x] Added OG/Twitter metadata to operational app HTML.
- [x] Added `VITE_PUBLIC_APP_URL` examples for absolute social-image URLs.
- [x] Added one named 1200×630 OG runtime image per app; removed redundant `og-default.png` duplicates.

### SEO-5 — Website metadata consolidation — COMPLETED
- [x] Centralized common SEO constants in `@pos/seo`.
- [x] Centralized page-level website SEO data under `apps/website/content/seo`.
- [x] Added absolute-title handling for branded homepage title.
- [x] Standardized `createPageMetadata` output for canonical, robots, OG and Twitter.
- [x] Derived static sitemap routes from shared indexability policy.
- [x] Kept product SEO/search-intent mapping in dedicated content data.
- [x] Added static fallback metadata at root layout level.

### SEO-6 — Structured-data hardening — COMPLETED
- [x] Centralized Organization schema.
- [x] Centralized WebSite schema.
- [x] Centralized SoftwareApplication schema.
- [x] Centralized Breadcrumb schema.
- [x] Added a real public Servora logo/icon URL to Organization schema.
- [x] Product structured data uses the same normalized site origin as canonical metadata.
- [x] Added schema-builder tests.
- [x] Did not add unsupported rating, FAQ or pricing claims.

### SEO-7 — On-page product SEO — COMPLETED
- [x] Replaced generic repeated capability filler with unique product-specific descriptions.
- [x] Added lightweight search-intent mapping for each product capability page.
- [x] Preserved one semantic H1 per public page/product detail.
- [x] Preserved descriptive related-product internal links.
- [x] Reviewed public marketing components for content-image alt requirements; current product/marketing visuals are component-rendered rather than content `<img>` assets.
- [x] Kept metadata and body copy free of obsolete `meta keywords`/keyword stuffing.

### SEO-8 — Automated audit and CI — COMPLETED
- [x] Added `scripts/seo/validate-seo.mjs`.
- [x] Added `scripts/seo/validate-assets.mjs`.
- [x] Added `scripts/seo/audit-built-pages.mjs`.
- [x] Added `scripts/seo/sync-assets.mjs`.
- [x] Added root `verify:seo`, `seo:check`, `seo:assets`, `seo:audit`, and `seo:sync-assets` commands.
- [x] Added SEO package tests.
- [x] Added website SEO-adapter tests.
- [x] Added SEO policy/asset verification to CI quality checks.
- [x] Static SEO policy and asset validators pass in the implementation workspace.

### SEO-9 — Production verification — BLOCKED
Requires the updated applications to be deployed to their actual production origins.

After deployment verify:
- [ ] Real production origin and preferred host.
- [ ] Rendered canonical URLs for representative public pages.
- [ ] `X-Robots-Tag` and robots meta on Web/Waiter/Kitchen/Customer.
- [ ] Website `/robots.txt` and `/sitemap.xml` responses.
- [ ] Static and dynamic OG images over HTTPS with correct content type/dimensions.
- [ ] LinkedIn/WhatsApp/Facebook/X social preview fetches.
- [ ] JSON-LD in rendered homepage/product source.
- [ ] Favicons and touch icons from each production app origin.


## Asset footprint cleanup — COMPLETED
- [x] Removed `social/og-default.png` from all five apps; the named per-app OG file is the fallback/default for that deployment.
- [x] Removed `icon-192.png`, `icon-512.png`, and `maskable-icon-512.png` from Web, Waiter, Kitchen, and Customer because those apps do not publish manifests/PWA install metadata.
- [x] Kept 192/512/maskable icons only in Website, where `manifest.ts` consumes them.
- [x] Updated `seo:sync-assets` so redundant files are actively deleted and cannot reappear during synchronization.
- [x] Updated `seo:assets` validation to fail if redundant runtime files are reintroduced.
- [x] Website static fallback now uses `social/og-website.png` directly.

## Verification performed in this workspace

Passed:

```text
node scripts/seo/sync-assets.mjs
node scripts/seo/validate-seo.mjs
node scripts/seo/validate-assets.mjs
node scripts/seo/audit-built-pages.mjs
git diff --check
```

Full Bun monorepo verification could not be executed in this environment because Bun/dependencies are not installed here. CI is configured to execute the SEO checks together with the existing lint/typecheck/test/build pipeline after `bun install --frozen-lockfile`.

## Final policy
- One favicon family is intentionally shared across all Servora apps.
- OG artwork is app-specific while remaining within one Servora visual system.
- Runtime favicon/OG outputs live under each app's `public/` directory, with only files actually consumed by that app.
- Editable/master assets live under `packages/seo/assets/`.
- Operational apps remain noindex; this is SEO policy, not an authorization boundary.
- Website is the current organic-search surface.
- Current QR/session Customer URLs remain noindex. A future stable public restaurant/menu URL system requires a separate indexable SEO design.
