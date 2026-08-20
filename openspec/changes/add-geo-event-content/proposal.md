## Why

The 2026-08-20 Hebrew AI-search baseline (ChatGPT, five buyer queries) cited ezratlv.com **zero times out of five** — including the query for which a dedicated page exists (company events) and two whose exact phrase already appears on the site (עד 50 איש, רווקות). The pages that did win share one property: they are *about* the asked-for use case, state it in the buyer's own words, and put the capacity number next to it. The site has four content pages and no page for four of the five intents buyers actually ask. This change builds the missing content: event-type pages and real-event showcase posts, wired into the already-live machine-readable layer.

Derived from **`add-event-marketing-growth`** in the ezra-plans hub (its `marketing/geo-ai-search` capability routes page implementation here). This change names that origin and does not copy its spec deltas; the hub owns the content contract and the recurring query test, this change owns the pages.

## What Changes

- **Four new Hebrew event-type pages**, one per lost intent, in commercial priority order: ערב/ארוחת צוות (team evening — phrase absent from the site today), אירוע עד 50 איש (capacity-led), מסיבת סיום הפקה/צילום (wrap party — phrase absent today), and מסיבת רווקות/אירוע פרטי (private). Each page answers the buyer's question directly: who it suits, capacity, what is included, formats, location, food and bar, how booking works, CTA — natural Hebrew, not keyword blocks.
- **Company-events page strengthened, not duplicated**: Q1 was lost despite the dedicated page; the fixes there are content additions (buyer-category language, use-case phrasing), no new page.
- **Real-event showcase posts** ("posts" from the request, interpreted as on-site pages, not social): each maps to an actual past event — who (anonymised as needed), group size, event type, what was requested, what was provided, why the venue fit. A small index page lists them; each event-type page links to the relevant showcases.
- **FAQ expansion** on the homepage FAQ and `/ai/faq.json`, sourced from questions customers actually asked, phrased as asked.
- **Machine-readable layer updated in the same change** — `sitemap.xml`, `llms.txt`, `llms-full.txt`, `/ai/*.json`, and per-page JSON-LD — never rebuilt, only extended. Structured data matches visible content.
- **Internal links** so every new page is reachable from the homepage and cross-linked by intent.

Out of scope: social-media posting, review collection (owned by `add-marketing-sprint-2026-08`), directory listings (hub task 4.5), English versions of the new pages (deliberate deviation from the repo's usual Hebrew/English pairing — see design), and any change to the booking engine.

## Capabilities

### New Capabilities

- `content/event-type-pages`: the Hebrew intent pages — which pages exist, what facts each must carry, URL and file conventions, structured data, and how each is registered in the sitemap and AI feeds.
- `content/event-showcases`: real-event showcase posts — truthfulness constraints, required fields, the index page, and linking from event-type pages.
- `content/faq-expansion`: growing the visible FAQ and `/ai/faq.json` from real customer questions without breaking the existing ten.

### Modified Capabilities

_None — `openspec/specs/` is empty; no existing capability specs to modify._

## Impact

- **New files at repo root** (static site, no build step): four event-type pages, showcase pages plus an index, all flat `.html` per repo convention.
- **Edited live files**: `index.html` (FAQ + internal links), `company-events.html` (content additions), `sitemap.xml`, `llms.txt`, `llms-full.txt`, `ai/faq.json`, `ai/service.json` — all deploy to production on push to `main` via Cloudflare Pages, so work lands on a branch and merges once reviewed.
- **Public repo**: no pricing strategy, margins, supplier terms, or internal planning in any page source or spec here; showcase posts contain only client-approved, verifiable facts.
- **Measurement**: hub's `knowledge/marketing/geo-query-log.md` re-run after ship (hub tasks 4.3–4.4) is the success check — this change does not duplicate the log.
