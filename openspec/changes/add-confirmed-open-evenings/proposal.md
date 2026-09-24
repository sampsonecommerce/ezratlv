# Confirmed open evenings are shown as open, not as private

Derived from the hub change `add-open-events-content-pipeline` (private hub repo). This change is
the site's part of it and does not restate the hub's requirements.

## Why

A closed open event is booked exactly like a private one: the promotion copies it onto Events
Form, so its date is in `booked` and `busy`. Until its content is approved and published, the
events page had no way to tell it apart from a private booking and rendered it as
"אירוע סגור · שמור לאירוע פרטי". On 2026-09-24 the reggae record night (29.9) and the cocktail
night (30.9) were both announced that way while being open to the public.

## What Changes

- The availability feed gains `openEvenings`: one entry per schedule-board item that is a real
  event (`סוג פריט` = `אירוע`), not cancelled, not in the past. Each entry carries only `date`,
  `type` (`סוג ערב`), `start` and `end`. Item names never leave the board this way: an
  unpublished item's name is an internal working title.
- `open-events.html` and `english-events.html` render such a date, when it has no published event,
  as open to the public: the night-type card (record night, wine and mixology, ...), "פרטים
  מלאים בקרוב", the badge "פתוח לקהל", and its hours. The month grid names it the same way. Its
  modal is the concept modal ("the lineup is updated a week ahead").
- `booked` and `busy` are unchanged: the date stays unavailable for private bookings.
- New CI gate: `open-evenings.test.mjs`.

## Impact

- Worker: `fetchConfirmedOpenEvenings()`, one more read of the schedule board per feed build
  (the feed is edge-cached for 60 seconds). Build `2026-09-24a`.
- Pages: both events pages. No other page reads `openEvenings`.
