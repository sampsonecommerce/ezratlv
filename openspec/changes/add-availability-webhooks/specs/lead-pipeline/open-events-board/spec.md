## Purpose

When the Open Events date check runs, and which leads it judges.

## ADDED Requirements

### Requirement: The date check runs when the boards change

The worker SHALL accept monday webhooks at `?hook=monday` guarded by `MONDAY_WEBHOOK_KEY`, SHALL echo monday's verification challenge only with the right key, and on any event SHALL run the availability passes without trusting the payload. It SHALL NOT run the promotion from a webhook. The 15-minute cron SHALL keep running the same passes.

#### Scenario: A lead is closed a minute after it arrives

- **WHEN** a site lead for a free date arrives and is set to Closed Deal within a minute
- **THEN** its זמינות תאריך reads פנוי within seconds of the webhook, and the lead is not sent back to In Contact

#### Scenario: A forged call

- **WHEN** someone posts to `?hook=monday` without the key
- **THEN** the response is 401 and no board is read or written

### Requirement: A closed lead is judged once, and never against itself

A committed Open Events lead whose זמינות תאריך reads לא נבדק SHALL be judged; one that already carries a judgement SHALL keep it. A lead SHALL NOT clash with its own promoted copy on Events Form, and a promoted open event SHALL count as an open event, not a private booking, for every other lead.

#### Scenario: Closed before the check

- **WHEN** a lead in Closed Deals reads לא נבדק and its only overlap is its own copy on Events Form
- **THEN** it reads פנוי
