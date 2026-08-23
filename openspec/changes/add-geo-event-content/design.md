## Context

See proposal.md - Why. Static-HTML repo, no build step, every page a flat root file, deployed to production on push to `main` via Cloudflare Pages (clean URLs - `/company-events` serves `company-events.html`). Hebrew primary; existing pages have `english-` twins. The machine-readable layer (`llms.txt`, `llms-full.txt`, `/ai/*.json`, JSON-LD) is live and produced a real ChatGPT lead. Content sourcing (real customer questions, real events for showcases) is owned by hub tasks 3.2–3.3 in `add-event-marketing-growth` and feeds this change.

## Goals / Non-Goals

**Goals**

- Four intent pages + strengthened company-events page, showcase posts with an index, expanded FAQ - all wired into the existing discovery layer in the same change.
- Every page good enough to be the cited answer for its query, judged by the baseline's winning property: use case in the buyer's words, capacity number beside it, complete answer on one page.

**Non-Goals**

- No new entity: pages describe the one venue; no second LocalBusiness identity in structured data.
- No touch of the booking engine, `_headers`, `_redirects`, or `robots.txt`.
- No English twins in this change (see Decision 2).
- `events.html` (calendar prototype, unlinked, not in sitemap) stays untouched.

## Decisions

1. **Flat root files, English kebab slugs**: `team-events.html`, `events-up-to-50.html`, `wrap-party.html`, `bachelorette-party.html`; showcases as `showcase-<slug>.html` with index `showcases.html`. Matches the repo's only convention (`company-events.html`) and Pages' clean-URL serving. Alternative - an `/events/` directory tree - rejected: introduces a second organizational scheme into a seven-page site for no retrieval benefit; citations in the baseline were flat venue URLs.

2. **Hebrew-only for the new pages, deliberately breaking the bilingual pairing rule**: the repo convention keeps Hebrew/English sets in sync, but all five lost queries are Hebrew, every winning citation was a Hebrew page, and doubling nine new files to eighteen doubles cost on the unproven half. English twins become a follow-up once a re-run shows the Hebrew pages being retrieved. The config rule stays correct for the *existing* page set, which this change still honors (company-events edits get mirrored to `english-company-events.html`).

3. **Page template cloned from `index.html`'s head and brand structure** - same tokens, Heebo, same nav/footer, same GA4/Ads/Pixel/Clarity tags hard-coded per page (no GTM exists). Tag parity checked against ANALYTICS.md. Alternative - a shared template include - impossible without a build step.

4. **JSON-LD per page: `WebPage` + `Service` referencing the existing LocalBusiness `@id`, plus `FAQPage` only where the page carries visible FAQs.** Keeps one entity with many described services rather than competing entities. Alternative - `Event` markup - wrong type: these are offerings, not dated occurrences.

5. **Distinct angle per page to avoid doorway-page sameness**: team-events = the organiser's evening (the WhatsApp-video story in page form); up-to-50 = formats by group size 15/30/50 and what exclusivity means; wrap-party = production vocabulary, late hours, crew logistics; bachelorette = private-event framing. Shared facts (address, capacity, inclusions) repeat; framing and formats do not.

6. **Showcases ship with at least one per commercial intent where a real event exists**, selected via hub task 3.3 (real, recent, consentable). A type with no consentable event gets no showcase rather than a thin or invented one - spec requirement.

7. **Branch discipline**: all work on a dated feature branch; single reviewed merge to `main` ships everything at once (pages + sitemap + llms + FAQ in one deploy, so the discovery layer never references a URL that is not live). Never `git add -A` in this public tree - every staged file looked at first.

## Risks / Trade-offs

- [Doorway-page perception - four pages about one venue] → Decision 5's distinct angles, real showcases as substance, natural-Hebrew spec requirement with review gate.
- [Baseline showed phrase presence is necessary but not sufficient - pages may still lose to recall] → expectation set in the hub: the winnable near-term change is retrieval; recall (Private Room appearing 4/5) is quarters-long. Directory listings (hub 4.5) attack recall separately.
- [Showcase consent friction stalls the proof layer] → pages ship without showcase links (spec allows omission); showcases follow as consent lands.
- [Mid-edit deploy to production] → single-merge discipline (Decision 7); Pages builds only on `main`.
- [Sitemap/llms drift as pages land] → wiring is part of each page's task, not a separate cleanup pass, and the publication-wiring scenario is the merge checklist.

## Migration Plan

1. Branch from `main`; build pages, showcases, FAQ, wiring on the branch.
2. Pre-merge checklist: phrase-presence grep per intent, JSON-LD validation, tag parity vs ANALYTICS.md, boundary check (no internal material), every sitemap/llms URL resolves in the branch tree.
3. One merge to `main` → Pages deploys; verify live URLs and structured data on production.
4. Hub side: re-run the query log ≥2 weeks post-ship (hub tasks 4.3–4.4). Rollback: revert the merge commit; the discovery layer and pages disappear together, leaving the prior state intact.

## Open Questions

- Which real events clear consent for named/photographed showcases (hub 3.3 decides; anonymised fallback specified).
- Whether `bachelorette-party.html` should widen to a general private-events page after the next query-log run - Q5 is the thinnest market; the re-run decides.
