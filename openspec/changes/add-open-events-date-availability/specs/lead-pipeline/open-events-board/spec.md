## Purpose

What the worker writes onto Open Events leads, and the one rule for which groups hold a date, shared by the public calendar and the board.

## ADDED Requirements

### Requirement: The worker writes each open lead's date availability

On every cron run the worker SHALL set `זמינות תאריך` on each Open Events item that is not in a committed group or Past Events and whose date is today or later (or missing): `פנוי` when its slot overlaps no committed booking, `תפוס - פרטי` when it overlaps a booking from Events Form, Company Events or the mirror group, `תפוס - פתוח` when it overlaps only another committed Open Events item, `לא נבדק` when it has no date. It SHALL write only when the value changes. If any of the three boards cannot be read, every judged lead SHALL be set to `לא נבדק`.

#### Scenario: Lead after midnight on a private evening

- **WHEN** a lead asks for 01:00-03:00 on the day after a Closed Deal that runs 18:00-02:00
- **THEN** it reads `תפוס - פרטי`

#### Scenario: A board read fails

- **WHEN** Events Form returns a GraphQL error during a run
- **THEN** no lead is set to `פנוי` in that run, and every judged lead reads `לא נבדק`

### Requirement: One committed-group rule

The availability feed and the `זמינות תאריך` writer SHALL decide which slots are taken through the same function. A group whose title contains "not closed" SHALL NOT be treated as committed on any board.

#### Scenario: Future Events lead

- **WHEN** a lead with a date sits in "Future Events (Not Closed, date is too far)"
- **THEN** its date is not in the feed's `booked` list, and no Open Events lead on that evening reads `תפוס` because of it
