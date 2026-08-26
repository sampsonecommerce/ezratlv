# Say only what is true about an evening

## Why

`add-board-published-events` made `/events` able to read the board. It did not
remove what the page said when the board said nothing - and that turned out to
be almost all of it.

Four separate sources of invention were live on the page:

| Source | What it was |
|---|---|
| `#archive` section + gallery modal | **13** past evenings that never happened, with fabricated titles and specific dates |
| `dayThemes` | 7 weekday templates, each a named evening with hours |
| `eventsConfig` | 5 hero slides, each stamped with a real upcoming date |
| `staticEvents` | 4 more invented evenings, one naming a chef and the two restaurants he supposedly left |

The section header promised `עם מי ניגן, מה הוגש וכמה אנשים היו`, and the code
called its cards "5 authentic event cards".

The sharpest case: **Moss Town was hardcoded as every Sunday**, in two places. It
is a one-off premiere on 2026-08-30, correctly published from the board. From
06.09 the page would have announced that premiere every Sunday, for ever.

Underneath all four is one modelling error: a **format** and an **instance** were
tangled. "Tuesday is a chef pop-up" is true every week. "Fire & Dough, 19:30 &
22:00" is true once, if at all.

## What Changes

- **All four invented sources removed.** The past archive goes entirely; it
  returns driven by the date having passed, which is settled but not built.
- **Formats replace templates.** One shared `EZRA_FORMATS` map - Sunday music
  (show or vinyl set), Tuesday chef pop-up - carrying a name and a description
  and nothing else. **No act name, no hour, no date pill.** Every other weeknight
  has no public format and the page claims nothing about it.
- **The hero waits for the board.** It used to paint the formats on first frame
  and swap them for the real evening when the feed landed, so the first thing it
  asserted was the least true version. It now paints once, on whichever of the
  feed or a 1500ms timeout arrives first.
- **"Not closed" stops meaning "open to the public".** A night nobody booked was
  rendering as a green `פתוח לקהל (20:00)` at an invented hour. Three states now:
  taken, genuinely public, or free to book.
- **The format cards open the signup**, which records which card it came from.
- **One palette across both calendars**, which were inverted against each other.

## Non-goals

- The past-events gallery. Removed, not rebuilt.
- Any change to availability. Publishing and describing never touch whether a
  date is taken.

## Impact

- `events.html` only. No worker change.
- [#101](https://github.com/sampsonecommerce/ezratlv/pull/101),
  [#102](https://github.com/sampsonecommerce/ezratlv/pull/102),
  [#103](https://github.com/sampsonecommerce/ezratlv/pull/103),
  [#104](https://github.com/sampsonecommerce/ezratlv/pull/104),
  [#105](https://github.com/sampsonecommerce/ezratlv/pull/105)
