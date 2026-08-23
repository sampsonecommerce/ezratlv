## Purpose

The Hebrew event-type pages on ezratlv.com - one page per real buyer intent, each answering that intent's question completely enough to be the page an AI search system cites for it. Derived from the `marketing/geo-ai-search` contract in the ezra-plans hub change `add-event-marketing-growth`.

## ADDED Requirements

### Requirement: One page per lost intent, in the buyer's words

The site SHALL carry a dedicated Hebrew page for each of these intents, each using the buyer's own phrasing in its title, heading, and body - not synonyms the venue prefers: ערב צוות / ארוחת צוות (team evening), אירוע עד 50 איש (capacity-led), מסיבת סיום הפקה / מסיבת סיום צילום (wrap party), and מסיבת רווקות ואירועים פרטיים (private / bachelorette). The 2026-08-20 baseline showed winners state the use case in the user's exact words; ערב צוות and מסיבת סיום appear nowhere on the site today.

#### Scenario: Phrase presence

- **WHEN** any of the four pages is published
- **THEN** the intent's exact Hebrew phrase appears in the page `<title>`, its `<h1>`, and body copy, and a text search of the live site finds the phrase on a page dedicated to that intent - not only as a passing mention elsewhere

#### Scenario: Page answers the question alone

- **WHEN** a reader or AI system lands on an event-type page with no other context
- **THEN** it can answer from that page alone: who the event type suits, capacity (with the number 50 stated next to the use case), what is included (food, bar, sound, lighting, production), possible formats, the address, and how to book - with a WhatsApp CTA present

### Requirement: Written as answers, not keyword blocks

Each page SHALL read as natural conversational Hebrew a person would say aloud. Keyword-stuffed headings, comma-separated phrase lists, and copy that exists only for matching SHALL NOT be published - the venue's own naming stays clean even where competitors win via padded listing titles.

#### Scenario: Copy review

- **WHEN** a page is reviewed before merge
- **THEN** every heading and paragraph reads as a sentence a host would say to a customer, and no element exists whose only purpose is phrase-matching

### Requirement: Pages are discoverable by machines and humans

Every new event-type page SHALL be registered in `sitemap.xml` and the `llms.txt` key-pages list, carry page-level JSON-LD consistent with its visible content, be reachable by link from the homepage, and cross-link the other event-type pages and relevant showcase posts. The existing machine-readable layer SHALL be extended, never rebuilt.

#### Scenario: Publication wiring

- **WHEN** an event-type page goes live
- **THEN** it appears in `sitemap.xml` and `llms.txt`, its JSON-LD claims match what the page visibly says, and at least one link from an existing indexed page reaches it

#### Scenario: No layer rebuild

- **WHEN** the machine-readable files are updated for the new pages
- **THEN** existing entries and structure in `llms.txt`, `llms-full.txt`, and `/ai/*.json` are preserved, with new entries added alongside them

### Requirement: Company-events page strengthened in place

The existing company-events page SHALL gain the buyer-category language the baseline showed it lacks (the phrasing buyers use for a small company event), as edits to the live page. A second company-events page SHALL NOT be created.

#### Scenario: No duplicate intent page

- **WHEN** the change ships
- **THEN** exactly one company-events page exists in the sitemap, and it contains the added buyer-phrasing content

### Requirement: Public-repo content boundary

Page sources and their structured data SHALL contain only public facts already published or approved for publication. Pricing beyond the public packages, margins, supplier terms, and internal planning SHALL NOT appear anywhere in this repo.

#### Scenario: Boundary check before merge

- **WHEN** the branch is reviewed before merging to `main`
- **THEN** no internal material appears in any added or edited file
