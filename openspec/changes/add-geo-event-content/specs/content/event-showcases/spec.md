## Purpose

On-site showcase posts for real past events — the proof layer the event-type pages link to, giving AI search systems and buyers concrete evidence the venue actually hosts each event type. Derived from the case-study truthfulness rule in the hub's `marketing/geo-ai-search` capability.

## ADDED Requirements

### Requirement: Every showcase maps to a real event

Each showcase post SHALL describe one actual past event and state: who it was for (anonymised or named only with consent), approximate group size, event type, what was requested, what was provided, and why the venue fit. Invented events, invented quotes, invented reviews, and details that cannot be verified SHALL NOT be published — an unverifiable detail is omitted, not approximated.

#### Scenario: Showcase drafted

- **WHEN** a showcase post is written
- **THEN** it maps to a verifiable past event, every stated fact is checked against what actually happened, and anything unverifiable is left out

#### Scenario: Consent for identification

- **WHEN** a showcase names a client, shows a recognisable person, or includes a quote
- **THEN** explicit consent exists for that identification, and otherwise the client is anonymised (e.g. "חברת הייטק, 35 משתתפים")

### Requirement: Showcases are indexed and cross-linked

The site SHALL carry a showcase index page listing all published showcase posts. Each showcase SHALL link to the event-type page matching its event type, and each event-type page SHALL link to at least one relevant showcase once one exists for its type.

#### Scenario: New showcase published

- **WHEN** a showcase post goes live
- **THEN** it appears on the index page and in `sitemap.xml`, and its event-type page links to it

#### Scenario: Type without a showcase

- **WHEN** an event-type page has no published showcase of its type yet
- **THEN** the page omits the showcase link section rather than linking to an unrelated event type

### Requirement: Showcases carry the intent vocabulary

Each showcase SHALL name its event type in the same Hebrew phrasing the matching event-type page uses (ערב צוות, מסיבת סיום צילום, etc.), so third-party-style descriptions of the venue in buyer vocabulary accumulate on-site.

#### Scenario: Vocabulary consistency

- **WHEN** a showcase for a wrap party is published
- **THEN** it uses מסיבת סיום הפקה / מסיבת סיום צילום in title or body, matching the wrap-party page's phrasing
