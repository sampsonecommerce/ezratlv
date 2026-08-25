# Open Events board

## ADDED Requirements

### Requirement: The board carries every committed event, money-free

The Open Events board SHALL contain one item per committed event on the Events
Form and Company Events boards, where committed is the same set of groups the
availability feed treats as booked.

Each such item SHALL carry the event's date, start and end time, event type,
time of day and guest count, and SHALL NOT carry any price, total, per-head
figure, pre-payment, discount or contract value.

#### Scenario: A booking is closed on the Company Events board

- **WHEN** an item moves into a committed group on a source board
- **THEN** an item appears on the Open Events board with that event's date,
  hours, type and guest count
- **AND** no price of any kind appears on it

#### Scenario: Notes carrying prices

- **WHEN** the source item's notes contain a line with a shekel amount
- **THEN** that line is absent from the mirrored notes
- **AND** the remaining lines are preserved verbatim

### Requirement: The sync owns only what it created

The sync SHALL identify the items it owns by a non-empty `Source Item` value and
SHALL NOT create, update or remove any item without one.

#### Scenario: A website lead promoted on this board

- **WHEN** an enquiry that arrived in New Leads is moved to Closed Deals on the
  Open Events board
- **THEN** the sync leaves it untouched in every subsequent run

#### Scenario: A booking is cancelled at the source

- **WHEN** a source item leaves every committed group
- **THEN** its mirror is removed from the Open Events board

### Requirement: Enquiries are not mirrored

An enquiry from ezratlv.com/events SHALL land in the board's New Leads group and
SHALL NOT block a date on the public calendar until it reaches a committed group.

#### Scenario: A fresh enquiry for a free date

- **WHEN** a visitor submits the events-page form for a date nothing is booked on
- **THEN** the item is created in New Leads with the enquiry's own details
- **AND** that date remains available to every other visitor
