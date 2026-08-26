# Tasks

All complete; shipped in PR #90 on 2026-08-26, badge follow-up in PR #93.

## 1. Board

- [x] 1.1 Add the eight publish columns to Open Events (`5102602771`); record
      the real ids, never guessed
- [x] 1.2 Fill the columns for the week's real events; leave the uncertain one
      unticked with its copy staged

## 2. Worker

- [x] 2.1 `PUB` column map beside `OE`
- [x] 2.2 `fetchPublicEvents()`: paged read, filtered on the checkbox's parsed
      `value` (absent column counts as unticked)
- [x] 2.3 Sanitise: repo-relative image paths only, `https` links only, events
      without a date dropped
- [x] 2.4 `public[]` on the availability response; failure degrades to an
      empty list
- [x] 2.5 `rsvp` lead type → New Leads, seating round filed on the hour
      column, no price anywhere
- [x] 2.6 `BUILD_ID` → `2026-08-26a`

## 3. Page

- [x] 3.1 Shared `ezraPublished` map with subscribers
- [x] 3.2 Hero spotlight builds from it; falls back when empty
- [x] 3.3 30-day strip and month grid describe published evenings by name;
      unpublished committed evenings stay "closed"
- [x] 3.4 Event modal: image gallery, artist link, seat-reservation form with
      rounds
- [x] 3.5 `[hidden] { display: none }` on the toggled flex containers
- [x] 3.6 Modal reads `badge` or `badgePill` (PR #93)

## 4. Tests

- [x] 4.1 `worker/test/public-events.test.mjs` from live board shapes; gated
      in `.github/workflows/deploy-worker.yml`
- [x] 4.2 RSVP case added to `open-events-lead.test.mjs`

## 5. Verification

- [x] 5.1 All four worker tests green
- [x] 5.2 Page driven in a browser against a stubbed feed, including the
      failure path and mobile
- [x] 5.3 Live feed and ezratlv.com checked after merge
