# Design

## Format and instance

A **format** is what a weeknight is at Ezra. An **instance** is what is actually
on. They are different kinds of claim and they need different rules.

| | Format | Instance |
|---|---|---|
| True | every week | once |
| Lives in | `EZRA_FORMATS`, in the page | the Monday board |
| May carry | a name, a description, an image | act, hours, entry type, photos, link |
| Never carries | act name, hour, **date** | - |
| In the hero | `ימי ראשון`, no time pill | `יום ראשון 30.08 · 20:00` |

A date pill on a format is the tell: it converts "Sundays are music nights" into
"there is a music night on this Sunday", which nobody has promised.

Today: Sunday is music, whether a show or a vinyl set; Tuesday is a chef pop-up.
A weekday absent from the map has no public format, and the page says only
whether the room is free.

## One source for three renderers

The hero slider, the 30-day strip and the month grid all read `EZRA_FORMATS` and
`ezraPublished`. This is not tidiness: a hero card announcing one thing above a
day card announcing another is worse than either alone, and the hero is above the
fold, so it is the version people believe.

## First paint waits

`paintHero()` is idempotent and runs on whichever arrives first:

- the feed, via `onEzraPublished`
- a **1500ms** timeout, so a dead feed shows the formats rather than an empty box

While waiting, the card keeps its frame and photo and hides only the copy
(`.is-awaiting-board`), so nothing moves when the text arrives. Later feed
updates still re-render, so unpublishing an event mid-session still lands.

The formats are the honest fallback for a dead feed precisely because they claim
a pattern rather than an evening.

## Three states, not two

`!isClosedEvening` was being read as "open to the public". It is not: a night
with nothing on the board and no recurring format is simply not open.

| State | Reads |
|---|---|
| Private booking | `אירוע פרטי / תפוס` |
| Published event, or a format night | `פתוח לקהל` - with a door time **only** when the board gave one |
| Anything else | `פנוי לאירוע`, clickable to enquire |

The invented `(20:00)` is gone from format nights. A format has no door time.

## One palette

The two calendars had used inverted palettes for the same two states - gold and
green swapped between the day cards and the month grid, with the legend agreeing
with the grid and contradicting the cards.

Settled on the day cards' meaning:

- **gold** - this date is yours to book (Ezra's accent, and the colour of every
  other call to action on the page)
- **green** - open to the public
- **red** - taken

## Signup attribution

The format cards are browsing, not enquiring, so they open a signup rather than
the booking form. The whole card is the target - somebody reading `מוזיקה חיה`
aims at the card, not at the small link inside it - with `role="button"`,
`tabindex`, an `aria-label` and Enter/Space parity. Clicks landing on a real
link are left alone so `לתאריכים הקרובים` still navigates.

Name and phone only. A third field costs signups and bought nothing that gets
used.

Which card it came from is the point: someone who asked about music nights is not
the same list as someone who asked about chef pop-ups. Each trigger carries a
stable slug - `food`, `music`, `tea`, `wine`, `spoken_word`, `vinyl`,
`open_events` - sent as `utm_content`, which the worker already writes to
**Online campaign I.D** on the board. No worker change. The Hebrew topic also
goes into the notes so the board reads without decoding slugs.

**Consequence to know:** the list is phone-only. Emailing it later means adding
that field back.

## Verifying a page-wide change to this

The preview tooling in a Claude Code session may be bound to an unrelated
project, and `file://` renders a static snapshot with no JS. The reliable browser
check is the PR's own Netlify deploy preview at
`deploy-preview-<N>--ezratlv.netlify.app`.

Note that the worker's CORS allowlist does not include Netlify, so on a preview
the feed never arrives and the page renders its **fallback** path. That is useful
- it is the only easy way to see the dead-feed behaviour - but it means published
events are not visible there. Check those on production after merge.
