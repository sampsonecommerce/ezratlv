# Publish real events from the Open Events board

Shipped 2026-08-26 (PR #90, worker build `2026-08-26a`). Written after the
fact so the change is recorded where changes to this repo are recorded.

## Why

`/events` had never read Monday. It rendered invented weekday templates, and
from 2026-08-25 a hero spotlight slider of more of them. Real public evenings -
a band on a Sunday, a guest-chef pop-up on a Tuesday - were being announced on
Instagram and rendered on our own site as `אירוע סגור · שמור לאירוע פרטי`.

Not a rendering bug. A modelling gap: a public evening is committed on the
board in exactly the way a private booking is, and nothing on any board told
the two apart. The page had no way to know, so it assumed private - the safe
assumption and the wrong answer.

## What Changes

- **Eight columns on the Open Events board (`5102602771`) carry the public
  face of an event**: a `Publish to site` checkbox, title, subtitle,
  description, images, link, an `Entry` status, and seating rounds.
- **The checkbox is the entire publish mechanism, default-off.** Unticked
  publishes nothing at all - not the title, not the notes, not a name. A
  booking becomes public only when a person ticks the box.
- **The worker returns published events as `public[]`** on the same
  availability response the calendar already fetches, so there is no window
  where the page knows a date is taken but not yet why.
- **Three renderers on `/events` read one shared source** - the hero
  spotlight, the 30-day strip and the month grid - so the page cannot disagree
  with itself about what an evening is.
- **Evenings whose `Entry` asks for a reservation get a seat form** using the
  board's seating rounds. It posts `leadType: "rsvp"` into New Leads, which is
  deliberately not a committed group.

## Non-goals

- **Publishing never changes availability.** `booked` and `busy` are untouched.
  Publishing changes how a taken evening is described, never whether it is
  taken.
- **No Monday file uploads for images.** Files uploaded to Monday are served
  behind a Monday login; the public site cannot render them. Images are
  repo-relative paths.
- **No prices, ever.** The published feed and the reservation carry no money,
  in either direction.
- **The past-events gallery** was out of scope here (removed separately the
  same day).

## Impact

- `worker/ezra-lead-worker.js`: `PUB` column map, `fetchPublicEvents()`,
  `public[]` on the feed, `rsvp` lead type. `BUILD_ID` → `2026-08-26a`.
- `events.html`: shared `ezraPublished` map with subscribers; hero, strip and
  month grid read it; event modal gains a gallery, an artist link and the
  reservation form.
- `worker/test/public-events.test.mjs`: new CI gate.
- Open Events board: eight new columns, ids recorded in the spec delta.
