# Published events on /events

## ADDED Requirements

### Requirement: The feed carries published events beside availability

The worker's availability response SHALL include a `public[]` array of
published events - date, title, subtitle, description, images, link, entry,
seating rounds, doors - read from the Open Events board and filtered on the
`Publish to site` checkbox.

A failed published-events read SHALL degrade to an empty array; it SHALL NOT
fail the availability response.

#### Scenario: The board read fails mid-request

- **WHEN** the published-events query errors
- **THEN** the response still carries `booked` and `busy`
- **AND** `public` is an empty array

### Requirement: Publishing never changes availability

A published event's date SHALL appear in `booked` and its window in `busy`
exactly as it would unpublished.

#### Scenario: An evening is published

- **WHEN** its item's checkbox is ticked
- **THEN** `booked` and `busy` for that date are byte-identical to the
  unticked case

### Requirement: Board content is sanitised before it reaches a page

Image entries SHALL be repo-relative paths: absolute URLs, protocol-relative
`//` and any path containing `..` are dropped. Links SHALL be kept only when
they begin `https://`. An event without a valid `YYYY-MM-DD` date SHALL be
dropped.

#### Scenario: Hostile column content

- **WHEN** the images column holds `https://evil.example/x.jpg, ../../etc/passwd,
  images/events/ok.jpg` and the link column holds `javascript:alert(1)`
- **THEN** the published event carries images `["images/events/ok.jpg"]` and no
  link

### Requirement: One source for every renderer

The page SHALL hold published events in a single date-keyed store that the
hero spotlight, the 30-day strip and the month grid all read, so no two
surfaces describe the same evening differently. When the store is empty, every
renderer falls back to its non-event presentation.

#### Scenario: A published evening on the page

- **WHEN** the feed delivers a published event for a date
- **THEN** the hero, the strip and the month grid all name it identically
- **AND** an unpublished committed evening on another date still renders as
  closed, with no detail

### Requirement: A reservation is a lead, not a booking

An evening whose entry type asks for a reservation SHALL offer a seat form
using the board's seating rounds. Submission SHALL create an Open Events lead
(`leadType: "rsvp"`) in New Leads - a non-committed group - carrying name,
phone, party size, date and the chosen round, and no price.

A failed submission SHALL present as a failure with an alternative contact
route; it SHALL NOT present as a held seat.

#### Scenario: A seat is requested at a sit-down evening

- **WHEN** a visitor picks a round and submits
- **THEN** a lead appears in New Leads with the round filed on the start-hour
  column
- **AND** the evening's date remains exactly as available or taken as before
