# Private lead form

## ADDED Requirements

### Requirement: Success is shown only after the lead is stored

The private-event form SHALL show its success panel only after the lead
endpoint has answered `ok`. On any other outcome it SHALL show a failure panel
with a retry and a WhatsApp fallback.

#### Scenario: The request fails or times out

- **WHEN** the POST returns a non-2xx status, `ok: false`, or does not answer
  within 15 seconds
- **THEN** the visitor sees the failure panel
- **AND** the typed values are still in the form behind "נסו שוב"

#### Scenario: The in-app browser closes right after send

- **WHEN** the page is unloaded within a few seconds of tapping send
- **THEN** the request was sent with `keepalive` so the lead can still be stored

### Requirement: One contact field is enough

A private lead SHALL be accepted with a phone number or an email address.

#### Scenario: Phone only

- **WHEN** the lead carries a phone and an empty email
- **THEN** the item is created with the phone column set
- **AND** no email column value is written

#### Scenario: Neither

- **WHEN** the lead carries neither phone nor email
- **THEN** the endpoint answers 400 and creates nothing

### Requirement: Traffic Source names the real origin when no UTM is present

A lead without a `utm_source` SHALL have its Traffic Source derived from the
referrer the page sent.

#### Scenario: Google organic

- **WHEN** `utm_source` is absent or `website` and `referrer` is a google.* host
- **THEN** Traffic Source is `google_organic`

#### Scenario: Direct

- **WHEN** `referrer` is an empty string
- **THEN** Traffic Source is `direct`

#### Scenario: Old cached page

- **WHEN** the payload has no `referrer` key at all
- **THEN** Traffic Source is left as sent

### Requirement: The form is finishable on a phone in the Instagram browser

Every question the board has SHALL still be asked, in three steps, with the
primary action always visible and errors shown inline.

#### Scenario: Required field left empty

- **WHEN** the visitor taps Next with the name empty
- **THEN** an inline message appears under the name field and the step does
  not advance
- **AND** no native browser validation bubble is relied on

#### Scenario: Marketing consent unchecked

- **WHEN** the visitor sends without ticking marketing consent
- **THEN** the lead is stored with Marketing Approval unchecked
