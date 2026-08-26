# Formats and instances

## ADDED Requirements

### Requirement: The page never names an evening the board has not published

The events page SHALL NOT display an act name, a door time, or a claim about a
specific date unless that information came from the board.

#### Scenario: A weeknight with a format and nothing published

- **WHEN** the board has no published event for an upcoming Sunday
- **THEN** the page describes the format - a music evening - without an act name,
  an hour, or a date pill
- **AND** it does not assert that any particular evening is taking place

#### Scenario: A weeknight with no format and nothing published

- **WHEN** the board has no published event and the weekday has no format
- **THEN** the page says only whether the room is free

#### Scenario: A one-off show
- **WHEN** a show is published for one date
- **THEN** it appears on that date only
- **AND** it does not recur on the same weekday afterwards

### Requirement: The hero's first frame is its true frame

The hero SHALL NOT render event content before the board has answered or the
fallback deadline has passed, and SHALL paint once.

#### Scenario: The feed answers normally

- **WHEN** the availability response arrives with published events
- **THEN** the hero's first painted frame shows those events

#### Scenario: The feed never answers

- **WHEN** no response arrives within the fallback deadline
- **THEN** the hero paints the weekday formats
- **AND** it is never left empty

### Requirement: An evening is public only if something makes it public

An evening SHALL be described as open to the public only when the board
published an event for it, or its weekday has a recurring format.

#### Scenario: A night nobody has booked

- **WHEN** an evening has no published event and its weekday has no format
- **THEN** it reads as available to book
- **AND** it is not described as open to the public, at any hour

#### Scenario: A format night with no instance
- **WHEN** an evening's weekday has a format and nothing is published
- **THEN** it reads as open to the public without a door time
