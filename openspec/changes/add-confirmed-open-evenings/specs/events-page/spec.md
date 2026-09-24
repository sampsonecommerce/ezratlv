## Purpose

How the events page describes a taken evening that belongs to a confirmed open event whose content is not published yet.

## ADDED Requirements

### Requirement: A confirmed open evening is never shown as private

The availability feed SHALL list, in `openEvenings`, every schedule-board item marked `סוג פריט` = `אירוע` whose `אישור תוכן` is not `בוטל` and whose date is today or later, with only its date, night type and hours. The events pages SHALL render such a date, when no published event covers it, as open to the public with its night type, and SHALL NOT render it as closed for a private event. The date SHALL remain in `booked` and `busy`.

#### Scenario: Closed deal, content still in draft

- **WHEN** an open record night closes for 29.9 and its schedule item is still `טיוטה`
- **THEN** the page shows 29.9 as a record night open to the public with details to come, and the private booking calendar still shows the evening as taken

#### Scenario: A placeholder

- **WHEN** a Tuesday holds only a `שומר מקום` item
- **THEN** it is not listed in `openEvenings`, and the page shows the Tuesday format as before

#### Scenario: A working title

- **WHEN** an unpublished schedule item is named after a customer or marked TEST
- **THEN** that name appears nowhere in the public feed
