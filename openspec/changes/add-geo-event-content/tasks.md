# Tasks: add-geo-event-content

Origin: `add-event-marketing-growth` (ezra-plans hub). Content inputs - real customer questions (hub 3.2) and showcase event selection with consent (hub 3.3) - arrive from the hub; page work that depends on them says so. All work on a dated branch off `main`; merge is task 6.4.

## 1. Foundation

- [x] 1.1 Create the working branch from `main`; confirm clean status before starting (no blanket staging in this public tree)
- [x] 1.2 Extract the shared page skeleton from `index.html` - head, brand tokens, nav, footer, and the full tag set (GA4 G-95JJX7T6CY, AW-18310736783, Meta Pixel, Clarity) - into a reference checklist verified against ANALYTICS.md, since there is no build step to share it

## 2. Event-type pages

- [x] 2.1 Write `team-events.html` - ערב צוות / ארוחת צוות in title, h1, body; the organiser's-evening angle; capacity beside the use case; formats, inclusions, address, WhatsApp CTA; WebPage + Service JSON-LD referencing the LocalBusiness `@id`
- [x] 2.2 Write `events-up-to-50.html` - אירוע עד 50 איש; formats by 15/30/50 band; what one-event-per-evening exclusivity means; same completeness and JSON-LD bar
- [x] 2.3 Write `wrap-party.html` - מסיבת סיום הפקה / מסיבת סיום צילום; production vocabulary, crew logistics, late-hours answer; same bar
- [x] 2.4 Write `bachelorette-party.html` - מסיבת רווקות framed inside private events; same bar
- [x] 2.5 Strengthen `company-events.html` in place with the buyer-category phrasing the Q1 answer showed missing (small company event language); no new page, booking wizard untouched
- [x] 2.6 Mirror the 2.5 content edits to `english-company-events.html` (existing bilingual pair stays in sync; new pages deliberately have no twins)

## 3. Showcase posts (needs hub 3.3 selection + consent)

- [ ] 3.1 Write one `showcase-<slug>.html` per consentable selected event, each stating who/size/type/requested/provided/why-it-fit, anonymised where consent is absent, intent vocabulary matching its event-type page
- [ ] 3.2 Write `showcases.html` index listing all published showcases
- [ ] 3.3 Cross-link: each showcase to its event-type page; each event-type page to its showcases where one exists, section omitted where none does

## 4. FAQ expansion (needs hub 3.2 question list)

- [ ] 4.1 Draft new entries from the real-question list in the customer's phrasing - covering capacity bands, team evenings, wrap parties, private events, logistics, food and drink incl. the kashrut answer (kosher-style available, no certification claim)
- [ ] 4.2 Add entries to the homepage visible FAQ and its FAQPage JSON-LD, preserving the existing ten
- [ ] 4.3 Update `/ai/faq.json` to the same set, Hebrew and English fields per its existing shape

## 5. Discovery-layer wiring

- [x] 5.1 Add every new page to `sitemap.xml`
- [x] 5.2 Add the new pages to `llms.txt` key pages and extend `llms-full.txt`; bump the last-updated line
- [x] 5.3 Extend `/ai/service.json` with the new event-type offerings, consistent with page content
- [x] 5.4 Add internal links from `index.html` to the event-type pages and cross-links between them

## 6. Verification and ship

- [x] 6.1 Phrase-presence check: grep the branch tree for each intent phrase; each found in its dedicated page's title, h1, and body
- [x] 6.2 Pre-merge checklist from design: JSON-LD validates and matches visible content; tag parity vs ANALYTICS.md on every new page; every sitemap/llms URL resolves; boundary check - no internal material, no unconsented identification
- [x] 6.3 Review pass for natural Hebrew: every heading and paragraph reads as spoken language; anything that exists only for phrase-matching removed
- [x] 6.4 Single reviewed merge to `main`; after Pages deploys, verify live URLs and structured data on production - merged 2026-08-20 as PR #19 (0c9a157); all five pages 200, JSON-LD parses live, tag set present, sitemap/llms/service.json carry the four new URLs
- [x] 6.5 Report ship date to the hub so the post-ship query-log run (hub 4.3–4.4) is scheduled ≥2 weeks out - shipped 2026-08-20, re-run due 2026-09-03, recorded in `knowledge/marketing/geo-query-log.md`
