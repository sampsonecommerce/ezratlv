# Company events builder

## ADDED Requirements

### Requirement: The builder never asks for commitment before value

The company-events builder SHALL show a running, non-binding estimate from
the first step and SHALL NOT require a date or a time slot to reach the
details step.

#### Scenario: Visitor skips the date

- **WHEN** the visitor reaches the date step and taps the skip link
- **THEN** the details step opens with the estimate unchanged
- **AND** the request is stored with an empty date

### Requirement: A completed request is an offer request

Submitting the details step SHALL create a lead in the "Estimate Requested"
group and SHALL NOT trigger any contract or agreement automation.

#### Scenario: Request sent

- **WHEN** name and a phone or email are filled and the visitor taps send
- **THEN** the item is created in Estimate Requested
- **AND** the confirmation promises an offer, with no contract or deposit
  language

### Requirement: Leaving after picking a plan offers a soft capture

#### Scenario: Close after plan chosen

- **WHEN** the visitor closes the builder after a plan is selected
- **THEN** an overlay offers to send the estimate by WhatsApp with one
  phone field
- **AND** filling it creates an incomplete lead naming the path

### Requirement: Typed details are never lost

#### Scenario: Name and phone typed, then abandoned

- **WHEN** name and a contact are typed on the details step and the visitor
  leaves without sending
- **THEN** exactly one incomplete lead exists for them

#### Scenario: Request completed after autosave

- **WHEN** the same visitor then sends the request
- **THEN** the incomplete lead is deleted and only the request remains

### Requirement: Guests outside the package range are routed, not clamped

#### Scenario: 80 guests typed

- **WHEN** the guests field is set to 80
- **THEN** the value stays, the estimate reads that pricing is by call, and
  a link into the talk form is shown
