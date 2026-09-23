# Date availability on Open Events leads, and a closed image proxy

Derived from the hub change `add-open-events-content-pipeline` (private hub
repo), which owns the contract for the open-events flow across the Monday
boards, Make and Buffer. This change is the worker's part of it and does not
restate the hub's requirements.

## Why

The Open Events board learned which dates were taken by holding copies of
other boards' bookings in `תאריכים תפוסים`: 73 of its 74 items by 2026-09-23.
The hub change replaces those copies with one status per lead, written by the
worker from the rule the site calendar already uses, so the board and the site
cannot disagree. Building it surfaced two defects in code this repo owns: the
"is this group committed" rule counted "Future Events (Not Closed, ...)" as
booked, and `?eventImage=` served any Monday file to anyone.

## What Changes

- The cron writes `זמינות תאריך` (`color_mm7frjv4`) on every open Open Events
  lead: `פנוי`, `תפוס - פרטי`, `תפוס - פתוח` or `לא נבדק`. It uses the same
  slot logic as the availability feed, now shared through `collectBusy()` and
  `itemSlots()`. `?sync=1` returns its result too.
- A group whose title contains "not closed" is never a committed group. This
  frees dates on the public calendar that were blocked by leads nobody had
  closed.
- `?eventImage=` serves only files on schedule-board items marked `פורסם באתר`
  and files on post subitems of items whose `אישור תוכן` is `מאושר`.
- Two new CI gates: `date-availability.test.mjs`, `image-proxy.test.mjs`.

Not in this change: retiring the mirror sync (a later PR, once the board no
longer relies on the mirror group).

## Capabilities

### New Capabilities

- `lead-pipeline/open-events-board`: what the worker writes onto Open Events
  leads, and the committed-group rule the calendar and the board share.
- `events-page`: which Monday files the public image proxy may serve.

## Impact

- `worker/ezra-lead-worker.js`, `worker/test/`, `.github/workflows/deploy-worker.yml`.
- Public calendar: dates held only by "Future Events (Not Closed ...)" leads
  become free.
- Site cards: unchanged; every file they use is on an item marked `פורסם באתר`.
