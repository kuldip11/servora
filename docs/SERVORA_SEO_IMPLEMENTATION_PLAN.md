# Servora SEO + Social Preview + Favicon Implementation Plan

**Status:** Implemented through SEO-8; production verification pending — see `SERVORA_SEO_IMPLEMENTATION_STATUS.md`  
**Scope:** `apps/website`, `apps/web`, `apps/waiter-app`, `apps/kitchen-display`, `apps/customer-app`  
**Goal:** Give Servora complete, deliberate SEO coverage: the public marketing website is indexable and optimized; operational apps are explicitly excluded from search; social previews and brand assets are consistent across all apps; SEO rules are centralized, testable, and difficult to regress.

---

## 1. SEO strategy by application

| App | Search indexing | SEO role | Social preview | Favicon |
| --- | --- | --- | --- | --- |
| `apps/website` | **Index** public marketing routes | Primary organic-search surface | Dynamic/page-specific OG | Shared Servora favicon |
| `apps/web` | **Noindex** all routes | Business/POS operational app | Static branded Web/Admin OG | Shared Servora favicon |
| `apps/waiter-app` | **Noindex** all routes | Staff operational app | Static Waiter OG | Shared Servora favicon |
| `apps/kitchen-display` | **Noindex** all routes | Kitchen operational app | Static Kitchen OG | Shared Servora favicon |
| `apps/customer-app` | **Noindex** current QR/session routes | Customer ordering runtime | Static Customer OG | Shared Servora favicon |

### Important rule

`noindex` is not a security mechanism. Authentication/authorization remains responsible for protecting private data. SEO controls only prevent search-engine indexing.

The current customer app is treated as operational because its public entry is QR/session based. If Servora later adds stable public restaurant/menu URLs such as `/restaurants/:slug` or `/menu/:slug`, those routes should receive a separate indexable SEO architecture instead of making QR/session URLs indexable.

---

## 2. Brand and favicon decision

### Decision: one favicon family for every Servora app

Use the **same core Servora favicon/logo mark** across Website, Business/Web, Waiter, Kitchen and Customer.

Reasons:

- favicon size is too small for meaningful per-app differentiation;
- one icon strengthens brand recognition across tabs and bookmarks;
- users already distinguish apps through page title and UI;
- separate favicons would create five mini-brands and increase asset maintenance;
- social/OG art and installable app icons are better places for app-specific identity.

### Canonical favicon/icon set

Create a single source set:

```text
packages/seo/assets/brand/
  servora-mark.svg
  favicon.svg
  favicon.ico
  apple-touch-icon.png        # 180x180
  icon-192.png
  icon-512.png
  maskable-icon-512.png
  logo-horizontal.svg
  logo-square.svg
```

Each app receives/copies the appropriate output under its public asset directory.

### App-specific installed-app identity

Favicons stay identical. If PWA/installable-app support is expanded later, app icons may use the same Servora `S` mark with a secondary app treatment:

- Business/Web: deep Servora green
- Waiter: green + small order/tray motif
- Kitchen: dark charcoal + green ticket motif
- Customer: warm cream + green ordering motif
- Website: canonical green brand icon

Do not create five unrelated logos.

---

## 3. Proposed shared SEO architecture

Create a small framework-neutral workspace package:

```text
packages/seo/
  package.json
  tsconfig.json
  src/
    index.ts
    constants.ts
    apps.ts
    routes.ts
    robots.ts
    schema.ts
    social.ts
    validation.ts
    test/
      apps.test.ts
      routes.test.ts
      schema.test.ts
      validation.test.ts
  assets/
    brand/
    og/
```

Package name:

```text
@pos/seo
```

### `constants.ts`

Store only global SEO/brand constants:

```text
SITE_NAME
DEFAULT_SITE_URL
DEFAULT_TITLE
DEFAULT_DESCRIPTION
DEFAULT_OG_TITLE
OG_IMAGE_WIDTH = 1200
OG_IMAGE_HEIGHT = 630
TWITTER_CARD = summary_large_image
BRAND_COLORS
BRAND_ICON_PATHS
```

No React/Next/Vite imports here.

### `apps.ts`

Single source of truth for application identity:

```ts
website: {
  id: "website",
  name: "Servora",
  title: "Servora — Restaurant operations, connected.",
  description: "...",
  indexable: true,
  themeColor: "...",
  ogAsset: "...",
}

web: {
  id: "web",
  name: "Servora Business",
  title: "Servora — Business",
  indexable: false,
  ...
}
```

Include all five apps.

### `routes.ts`

Define public website route SEO policy in one registry instead of manually keeping the sitemap and metadata inventory disconnected.

For each route store:

```text
path
indexable
sitemap
canonical
changeFrequency
priority
OG variant
schema types
```

Product route data should continue to come from the existing `modules` content registry instead of duplicating product data.

### `robots.ts`

Framework-neutral policy helpers:

```text
PUBLIC_INDEX_POLICY
PRIVATE_APP_POLICY
NOINDEX_PAGE_POLICY
```

Private apps should resolve to:

```text
noindex, nofollow, noarchive, nosnippet
```

### `schema.ts`

Pure JSON-LD builders:

```text
createOrganizationSchema()
createWebSiteSchema()
createSoftwareApplicationSchema()
createBreadcrumbSchema()
createOfferSchema()      # only after pricing is stable/public
```

Never generate claims or values that are not visible/true on the page.

### `social.ts`

Shared social-image definitions:

```text
OG dimensions
safe padding
brand labels
app display names
fallback copy
variant IDs
```

### `validation.ts`

Reusable assertions for:

- valid absolute HTTPS production URLs;
- no `.example` production domain;
- canonical paths begin with `/`;
- OG images are 1200x630;
- indexable routes have title/description/canonical;
- non-indexable apps cannot accidentally declare `index`;
- sitemap cannot include noindex routes.

---

## 4. Website-specific Next.js SEO adapter

Keep:

```text
apps/website/lib/seo.ts
```

but change it into the **Next.js adapter** rather than the source of shared brand truth.

It should import framework-neutral data from `@pos/seo` and expose:

```text
getSiteUrl()
getAbsoluteUrl(path)
getOgImageUrl(options)
createPageMetadata(options)
createNoIndexMetadata(options)
```

### `createPageMetadata()` requirements

Every indexable marketing page should receive:

- unique title;
- unique meta description;
- canonical;
- `robots: index, follow`;
- Open Graph type/title/description/url/image;
- Twitter `summary_large_image`;
- correct image alt text.

Support an explicit `absoluteTitle` or title mode to prevent strings such as:

```text
Servora — Every order. Every team. One flow. | Servora
```

when the title already contains the brand.

---

## 5. Website SEO data organization

Do not put long SEO strings directly in React components when they are reusable page data.

Proposed structure:

```text
apps/website/content/seo/
  pages.ts
  legal.ts
  schema.ts
```

### `pages.ts`

Marketing page metadata data for:

```text
/
/product
/apps
/pricing
/book-a-demo
/contact
```

Each entry:

```text
title
description
path
ogTitle
ogEyebrow
imageAlt
indexable
```

### Product pages

Do not create duplicate product SEO data if `content/modules` already contains the necessary product information. Extend that registry only where a specific SEO field is genuinely needed, e.g.:

```text
seoTitle
seoDescription
ogTitle
searchIntent
```

### Legal pages

Until approved legal copy exists:

```text
index: false
sitemap: false
```

When real legal content replaces placeholders, intentionally reconsider indexing; do not automatically switch it on.

---

## 6. Search indexing protection for operational apps

Affected:

```text
apps/web
apps/waiter-app
apps/kitchen-display
apps/customer-app
```

Implement **two layers** of protection.

### Layer 1 — HTML robots meta

Every Vite app `index.html`:

```html
<meta
  name="robots"
  content="noindex,nofollow,noarchive,nosnippet"
/>
```

Also add the equivalent Googlebot directive if desired for explicitness.

### Layer 2 — response header

Each `vercel.json` should return:

```http
X-Robots-Tag: noindex, nofollow, noarchive, nosnippet
```

for all routes.

This is especially important because all four apps use catch-all SPA rewrites that otherwise return the app shell for arbitrary paths.

### Do not rely on `robots.txt` alone

`Disallow: /` is not a substitute for `noindex`: blocking crawling can prevent search engines from seeing the noindex instruction. Header/meta noindex is the primary mechanism.

### No sitemaps for operational apps

Do not add sitemaps for Web, Waiter, Kitchen or the current Customer QR app.

---

## 7. Browser titles/descriptions for operational apps

Even though they are noindex, browser metadata should be professional and consistent.

Target titles:

```text
Web       -> Servora — Business
Waiter    -> Servora — Waiter
Kitchen   -> Servora — Kitchen
Customer  -> Servora — Order at your table
```

Descriptions are for brand/share quality, not ranking:

```text
Business -> Manage restaurant orders, menus, staff, inventory and operations with Servora.
Waiter   -> Servora's waiter workspace for taking and managing restaurant orders.
Kitchen  -> Servora Kitchen Display for live preparation and order workflow.
Customer -> Browse the menu and order from your table with Servora.
```

Do not expose tenant, user, order or QR-session data in metadata.

---

## 8. OG/social image system

### Common rules

All OG images:

```text
1200 x 630 px
PNG preferred for deterministic social-crawler support
< 1 MB target where practical
brand-safe 64–80 px margins
logo/brand in top-left
short headline, not a paragraph
high contrast
no tiny UI text
no tenant/user/private data
```

Use the same brand system but a distinct composition for each app.

### A. Marketing Website OG

**Purpose:** organic/social acquisition.

Design:

- warm off-white/cream Servora background;
- Servora green logo/wordmark;
- orange accent;
- headline: `Every order. Every team. One flow.`;
- product montage on right: simplified POS + kitchen ticket + mobile customer order cards;
- footer line: `Guest · Waiter · Kitchen · Business`;
- page-specific variants replace the headline and featured mockup.

Variants:

```text
home
product overview
POS & Orders
Kitchen Display
QR Ordering
Menu Management
Inventory
Staff & Roles
Multi-branch
Analytics
Billing & Payments
Security
Pricing
Apps
Book a Demo
Contact
```

Dynamic generation via Next `ImageResponse` remains appropriate for marketing pages.

### B. Business/Web OG

**Purpose:** brand preview if app URL is shared; still noindex.

Design:

- label: `Servora Business`;
- headline: `Restaurant operations in one workspace.`;
- simplified dashboard/POS visual;
- metrics/menu/order cards without real data;
- deep green/cream palette.

Store static file:

```text
apps/web/public/social/og-business.png
```

### C. Waiter OG

Design:

- label: `Servora Waiter`;
- headline: `Take orders. Keep service moving.`;
- mobile/handheld menu + table/order ticket composition;
- Servora green with a lighter service accent;
- no real table/customer/order information.

```text
apps/waiter-app/public/social/og-waiter.png
```

### D. Kitchen OG

Design:

- label: `Servora Kitchen`;
- headline: `From order to ready, clearly.`;
- dark KDS board with stylized ticket columns;
- charcoal background, Servora green status accent, warm ready-state accent;
- use fake/static ticket labels only.

```text
apps/kitchen-display/public/social/og-kitchen.png
```

### E. Customer OG

Design:

- label: `Servora Order`;
- headline: `Order from your table.`;
- phone/menu/cart visual;
- cream background, green CTA treatment, warm food accent;
- never include QR token or restaurant-session data in OG metadata.

```text
apps/customer-app/public/social/og-customer.png
```

### Static vs dynamic rule

- Website: dynamic OG route + fallback static brand image.
- Operational Vite apps: static OG image only; no reason to generate per-route images.

---

## 9. OG metadata for Vite apps

Add static social tags to each app root HTML for branding when URLs are pasted into chat/social tools:

```text
og:type
og:site_name
og:title
og:description
og:image
og:image:width
og:image:height
twitter:card
twitter:title
twitter:description
twitter:image
```

These apps remain noindex. Social preview metadata does not mean they should rank in search.

Absolute image URLs are required. Add an app-origin environment variable where missing:

```text
VITE_PUBLIC_APP_URL
```

for Waiter/Kitchen/Customer, or adopt one consistently named variable across all Vite apps.

Do not hardcode Vercel preview URLs into metadata.

---

## 10. Canonical and duplicate-URL policy

### Marketing website

Choose one production origin as canonical and consistently use it for:

```text
metadataBase
canonical links
OG URL
schema URLs
sitemap URLs
robots sitemap URL
```

Rules:

- HTTPS only;
- one preferred host (`www` or non-`www`, not both);
- one trailing-slash policy;
- permanent redirect from alternate production host where applicable;
- canonical should normally exclude tracking parameters;
- preview deployments must not become canonical production URLs.

### Operational apps

Do not add route-specific canonical tags as an alternative to noindex. They are private operational surfaces, not duplicate public content to consolidate.

---

## 11. Sitemap plan

Only `apps/website` owns a sitemap.

Build the sitemap from the central route policy plus product module registry so an indexable page cannot be forgotten.

Exclude:

```text
/login
placeholder legal pages
API routes
operational app URLs
QR/session URLs
preview/internal/debug routes
noindex pages
```

Only include `lastModified` when there is a meaningful source of truth. Do not stamp every route with an artificial date merely to populate the field.

---

## 12. Robots plan

### Website

Maintain a normal public robots response:

```text
Allow public pages
Disallow API endpoints
Disallow login/auth utility paths where appropriate
Expose sitemap URL
```

Do not accidentally disallow CSS/JS/image assets needed for rendering.

### Operational apps

Primary control is `X-Robots-Tag` + HTML noindex.

No search sitemap.

---

## 13. Structured data plan

### Homepage

Maintain:

```text
Organization
WebSite
SoftwareApplication
```

Improve with real brand assets:

```text
logo
url
sameAs        # only real official profiles
```

### Product pages

Maintain:

```text
SoftwareApplication
BreadcrumbList
Organization reference
```

Possible later additions only when true/visible:

```text
Offer          # when public pricing is stable
aggregateRating # only with legitimate rating data; never fabricate
FAQPage         # only if visible FAQ content warrants it
```

### Pricing page

If Servora exposes fixed public plans/prices, structured `Offer` data may be added and must exactly match visible pricing.

### Operational apps

No SEO schema is necessary.

---

## 14. On-page SEO optimization for website

Each indexable page must have:

- one meaningful H1;
- logical H2/H3 hierarchy;
- unique page title;
- unique description;
- unique, useful body copy;
- descriptive internal links;
- meaningful image alt text;
- crawlable navigation links;
- no generic repeated filler sections masquerading as unique product content.

### Product-page content template

Each product page should eventually cover, with unique content:

```text
1. What the feature solves
2. Core capabilities
3. Typical workflow
4. Restaurant/business benefits
5. Role-specific usage
6. How it connects to the rest of Servora
7. Relevant related products
8. FAQ where genuinely useful
9. CTA
```

Avoid repeated implementation-oriented copy such as “capability represented in the current product architecture.” Public SEO copy should describe customer value.

### Search-intent mapping

Maintain a lightweight internal mapping in SEO data, e.g.:

```text
POS & Orders       -> restaurant POS software / restaurant order management
Kitchen Display    -> restaurant kitchen display system / KDS
QR Ordering        -> restaurant QR ordering system
Inventory          -> restaurant inventory software
Analytics          -> restaurant analytics software
Multi-branch       -> multi-location restaurant management
Menu Management    -> restaurant menu management software
Staff & Roles      -> restaurant staff management / POS roles
Billing & Payments -> restaurant billing/POS payments
```

This is content guidance, not a `<meta name="keywords">` field. Do not add obsolete keyword meta tags.

---

## 15. Image SEO rules

For website content images:

- descriptive `alt` when image carries information;
- empty `alt=""` for purely decorative imagery;
- no filenames like `image123.png` for important marketing assets;
- stable width/height/aspect ratio;
- use Next Image where appropriate;
- avoid embedding important searchable text only inside images.

OG image alt text should also be meaningful.

---

## 16. 404 and soft-404 policy

### Website

Unknown marketing routes must produce a genuine Next.js 404/not-found response and must not emit indexable generic content.

### Vite SPAs

Catch-all rewrites are required for client routing, but because they can return `200` for arbitrary paths, the entire operational deployment must remain noindex.

Do not attempt to solve the SPA soft-404 issue by making operational routes indexable.

---

## 17. Environment variables

### Website

Continue using:

```text
NEXT_PUBLIC_SITE_URL
```

as the canonical public marketing origin.

### Vite apps

Adopt consistent app-origin variables for absolute OG URLs, preferably:

```text
VITE_PUBLIC_APP_URL
```

in each app's own environment.

Existing Web cross-app variables should not be repurposed ambiguously.

### Production validation

The SEO validator must reject:

- missing production URL;
- non-HTTPS production URL;
- `.example` placeholder;
- trailing malformed origin/path;
- relative OG image where an absolute URL is required in static Vite HTML.

---

## 18. SEO validation tooling

Add:

```text
scripts/seo/
  validate-seo.mjs
  validate-assets.mjs
  audit-built-pages.mjs
```

Root commands:

```json
"seo:check": "node scripts/seo/validate-seo.mjs",
"seo:assets": "node scripts/seo/validate-assets.mjs",
"seo:audit": "node scripts/seo/audit-built-pages.mjs"
```

### `validate-seo.mjs`

Static checks:

- public route has SEO data;
- noindex routes are not in sitemap registry;
- all operational apps are configured noindex;
- canonical route values are valid;
- titles/descriptions are non-empty and within agreed quality bounds;
- OG dimensions are 1200x630;
- no placeholder production domain in production config.

### `validate-assets.mjs`

Verify:

- all favicon files exist;
- every referenced OG image exists;
- image dimensions are correct;
- app manifests reference existing icons;
- schema logo asset exists.

### `audit-built-pages.mjs`

Against a local production build or deployment:

- HTTP status;
- title;
- description;
- robots;
- canonical;
- OG fields;
- Twitter fields;
- JSON-LD parseability;
- favicon response;
- sitemap/robots response;
- OG image response content type and dimensions.

---

## 19. Tests

### Unit tests

Test:

```text
createPageMetadata
getSiteUrl / getAbsoluteUrl
OG URL builder
route registry
schema builders
SEO validation rules
```

### Integration tests

Website:

- homepage emits expected metadata;
- representative product page emits canonical + OG + schema;
- login emits noindex;
- placeholder legal pages emit noindex until approved;
- sitemap excludes all noindex routes;
- robots references correct sitemap.

Vite apps:

- built/index HTML includes noindex;
- correct title/description;
- favicon references an existing asset;
- static OG image path exists;
- Vercel config includes `X-Robots-Tag`.

### CI gate

Add SEO checks to quality/release verification after relevant builds.

SEO regressions should fail CI, particularly:

- missing noindex on an operational app;
- noindex page accidentally entering sitemap;
- missing favicon/OG asset;
- placeholder canonical domain in production.

---

## 20. Manifest/icon coverage

### Website

Extend current manifest with:

```text
icons
theme_color
background_color
```

### Other apps

A manifest is optional unless PWA/install behavior is desired. Do not add a manifest solely to claim SEO coverage.

Favicons should still be present regardless of manifest support.

---

## 21. Proposed final asset/file layout

```text
packages/seo/
  src/
    constants.ts
    apps.ts
    routes.ts
    robots.ts
    schema.ts
    social.ts
    validation.ts
    index.ts
  assets/
    brand/
      servora-mark.svg
      logo-horizontal.svg
      logo-square.svg
      favicon.svg
      favicon.ico
      apple-touch-icon.png
      icon-192.png
      icon-512.png
      maskable-icon-512.png
    og/
      website.svg + website.png
      web.svg + web.png
      waiter.svg + waiter.png
      kitchen.svg + kitchen.png
      customer.svg + customer.png

apps/website/public/
  favicon.svg
  favicon.ico
  apple-touch-icon.png
  icon-192.png
  icon-512.png
  maskable-icon-512.png
  social/og-website.png

apps/web/public/
  favicon.svg
  favicon.ico
  apple-touch-icon.png
  social/og-business.png

apps/waiter-app/public/
  favicon.svg
  favicon.ico
  apple-touch-icon.png
  social/og-waiter.png

apps/kitchen-display/public/
  favicon.svg
  favicon.ico
  apple-touch-icon.png
  social/og-kitchen.png

apps/customer-app/public/
  favicon.svg
  favicon.ico
  apple-touch-icon.png
  social/og-customer.png

scripts/seo/
  validate-seo.mjs
  validate-assets.mjs
  audit-built-pages.mjs
```

Where practical, copied app assets should be generated/synced from the canonical source instead of manually maintaining five different copies.

---

## 22. Implementation phases

### Phase SEO-1 — Shared foundation
**Status: Completed**

- create `@pos/seo`;
- move global SEO constants/app identities into it;
- add route/indexing policies;
- add validation helpers;
- preserve existing website behavior.

**Exit:** shared configuration has tests and website still compiles.

### Phase SEO-2 — Search-indexing safety
**Status: Completed**

- add noindex metadata to Web/Waiter/Kitchen/Customer;
- add `X-Robots-Tag` headers to all four deployments;
- noindex current placeholder legal pages;
- remove noindex legal routes from sitemap.

**Exit:** only intended website marketing routes can be indexed.

### Phase SEO-3 — Favicon/brand assets
**Status: Completed**

- create final Servora master mark;
- export favicon/icon sizes;
- wire same favicon family into all five apps;
- remove broken Web favicon reference;
- add schema/logo-compatible public asset;
- expand website manifest.

**Exit:** every app has a valid browser icon and the website has complete icon metadata.

### Phase SEO-4 — Social/OG system
**Status: Completed**

- refine website dynamic OG renderer;
- build fallback website OG image;
- create Business/Waiter/Kitchen/Customer static OG designs;
- add static OG/Twitter tags to Vite apps;
- ensure absolute production image URLs.

**Exit:** every root app URL has a deliberate social preview, while operational apps remain noindex.

### Phase SEO-5 — Website metadata consolidation
**Status: Completed**

- central page SEO data;
- fix branded-title duplication;
- use shared `getSiteUrl`/absolute URL helper everywhere;
- remove structured-data URL drift;
- derive sitemap from route policy;
- validate canonical consistency.

**Exit:** one source of truth drives metadata/sitemap/schema URLs.

### Phase SEO-6 — Structured data hardening
**Status: Completed**

- enrich Organization with real logo;
- validate WebSite/SoftwareApplication/Breadcrumb schema;
- only add offers/FAQ schema where visible and factual;
- test JSON-LD output.

**Exit:** all schema is valid, consistent and factual.

### Phase SEO-7 — On-page product SEO
**Status: Completed**

- remove generic repeated product copy;
- strengthen unique search-intent content;
- review H1/H2/H3 hierarchy;
- improve link text/internal cross-linking;
- audit image alt text.

**Exit:** each product page is materially unique and useful, not merely metadata-optimized.

### Phase SEO-8 — Automated audit and CI
**Status: Completed**

- add SEO validation scripts;
- asset validation;
- build/deployment audit;
- CI/release gate;
- document expected production checks.

**Exit:** regressions are caught automatically.

### Phase SEO-9 — Production verification
**Status: Blocked — requires production deployment**

After deployment verify:

- production canonical host;
- `/robots.txt`;
- `/sitemap.xml`;
- all indexable website pages;
- representative noindex routes/apps;
- favicon responses;
- OG image responses;
- rendered page source metadata;
- JSON-LD validity;
- social previews in major crawlers/debuggers.

**Exit:** production output matches repository intent.

---

## 23. Definition of SEO complete for Servora

SEO work is considered complete when all of the following are true:

1. Only intended marketing website pages are indexable.
2. Business/Web, Waiter, Kitchen and current Customer QR app are explicitly noindex at HTML and response-header levels.
3. No noindex route appears in the sitemap.
4. Every indexable website page has unique title, description and canonical.
5. Every indexable page has valid Open Graph and Twitter metadata.
6. OG images are valid 1200x630 assets/responses with deliberate Servora designs.
7. Every app has a working favicon; the website has full icon/manifest coverage.
8. Canonical, OG, sitemap and schema URLs use the same production origin.
9. Structured data is valid and only contains factual visible information.
10. Placeholder legal pages are not indexed until real content exists.
11. Website product pages contain unique useful content aligned to search intent.
12. All referenced SEO assets exist and are validated.
13. SEO validation runs in CI/release checks.
14. Production verification confirms rendered metadata, indexing policy and social preview behavior.

---

## 24. Out of scope unless the product changes

Do **not** add these merely for appearance of completeness:

- `meta keywords`;
- fake ratings/reviews;
- fake `sameAs` profiles;
- FAQ schema without actual visible FAQs;
- sitemaps for operational apps;
- route-level SEO for private orders/users/tables;
- indexable QR/session URLs;
- five unrelated favicon brands.

If public restaurant/menu discovery becomes a Servora product feature, create a new SEO phase specifically for tenant/menu landing pages, including tenant-specific canonical URLs, Restaurant/Menu schema, public slugs and indexing rules.

---

## 25. Runtime asset storage and creation responsibility

Static runtime SEO assets are stored in each deployed app's `public` directory so they resolve from stable root URLs. Editable/master brand sources live in `packages/seo/assets/brand`, and generated/exported assets are copied into `apps/*/public`.

Implementation includes the **design, creation, export, integration and validation** of all favicon and Open Graph assets. It is not limited to wiring metadata to pre-existing images.

Runtime outputs are intentionally minimal. Every app gets only the shared browser/touch icon family plus its single app-specific OG card:

```text
public/
  favicon.svg
  favicon.ico
  apple-touch-icon.png
  social/
    og-<app>.png
```

Only `apps/website` additionally receives `icon-192.png`, `icon-512.png`, and `maskable-icon-512.png`, because its `manifest.ts` actually consumes those PWA/install assets. Web, Waiter, Kitchen, and Customer must not carry unused 192/512/maskable variants.

The website retains dynamic Next.js OG generation for page-specific previews, while `public/social/og-website.png` is the static site-wide fallback. No app keeps a duplicate `og-default.png`; the named per-app OG image is itself the default for that deployment.
