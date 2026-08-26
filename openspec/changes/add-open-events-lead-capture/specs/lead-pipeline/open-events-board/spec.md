# Open Events board

## ADDED Requirements

### Requirement: An enquiry lands in New Leads and blocks nothing

An enquiry from ezratlv.com/events SHALL be created in the Open Events board's
New Leads group, and SHALL NOT cause its requested date to read as unavailable
to any other visitor.

#### Scenario: A visitor enquires about a free date

- **WHEN** the events-page form is submitted for a date nothing is booked on
- **THEN** the item is created in New Leads
- **AND** that date remains available on the public calendar

#### Scenario: A browser holding a cached page posts a retired group id

- **WHEN** the submitted group id does not exist on the board
- **THEN** the item is still created in New Leads
- **AND** it is never filed into the board's default group

### Requirement: A lead carries its attribution

A lead SHALL be written using the target board's own column ids, and SHALL carry
the campaign attribution it arrived with.

#### Scenario: A lead arrives from a Google ad

- **WHEN** the enquiry carries `utm_source`, `utm_campaign`, `utm_content` and `gclid`
- **THEN** each is written to its dedicated column on the board
- **AND** the customer's name is written to the item name, never to Campaign Name

#### Scenario: The board defines a label the site does not know

- **WHEN** an event type is submitted that the board has no label for
- **THEN** the lead is still created, with the event type recorded in the notes

## MODIFIED Requirements

### Requirement: The calendar reads every committed booking

The availability feed SHALL read all items on each source board, and SHALL treat
a group as committed only against the board that group belongs to.

#### Scenario: A board holds more items than one page

- **WHEN** a source board holds more items than a single `items_page` returns
- **THEN** the feed follows the cursor to the end
- **AND** a booking beyond the first page still marks its date taken

#### Scenario: Two boards share a group id

- **WHEN** a group id names a committed group on one board and a lead group on another
- **THEN** only the board whose list contains it treats it as committed
- **AND** a lead on the other board does not block its own requested date

#### Scenario: One event, two events in a day

- **WHEN** a date holds a committed afternoon event and nothing in the evening
- **THEN** the evening remains available
