# Promotion out of Open Events

## ADDED Requirements

### Requirement: A music lead is owned by the person who books music

A lead whose event type is a show or a listening party SHALL be assigned to the
music booker, and SHALL be workable entirely on the Open Events board.

#### Scenario: A show enquiry arrives

- **WHEN** an enquiry's event type is set to `הופעה` or `מסיבת השמעה`
- **THEN** the music booker is assigned as Owner and notified
- **AND** no money column is present on that board for them to see

### Requirement: A committed evening reaches the sales pipeline

A lead reaching Proposal Sent, Pre Payment or Closed Deal SHALL appear on Events
Form, whether or not any payment is attached to it.

#### Scenario: An invited show closes with no payment

- **WHEN** a show is agreed with no prepayment and its status becomes Closed Deal
- **THEN** a copy appears on Events Form
- **AND** it is treated as a real event, holding its date and slot

### Requirement: An event reaches the operations board exactly once

An event SHALL reach the Ivchu operations board through Events Form only.

#### Scenario: A promoted lead closes

- **WHEN** a promoted copy on Events Form reaches Closed Deal
- **THEN** exactly one item is created on the operations board
- **AND** no second item is created by any Open Events automation

### Requirement: Promotion does not loop

A promoted copy SHALL carry a marker identifying it as promoted, and the mirror
sync SHALL NOT mirror a marked item back onto Open Events.

#### Scenario: A promoted copy sits in a committed group

- **WHEN** the sync next runs over a committed item carrying a Source Item value
- **THEN** no mirror is created for it on Open Events
- **AND** the original lead remains the only copy of that event there

#### Scenario: An ordinary committed booking

- **WHEN** a committed item has no Source Item value
- **THEN** it mirrors onto Open Events exactly as before
