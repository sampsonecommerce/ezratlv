## Purpose

Growing the homepage FAQ and `/ai/faq.json` from questions customers actually ask, so the FAQ answers real buyer language without breaking the existing published set.

## ADDED Requirements

### Requirement: Questions come from real enquiries, phrased as asked

New FAQ entries SHALL be sourced from real customer questions (WhatsApp, phone, enquiry forms), phrased the way customers asked them, covering at minimum where currently missing: capacity bands (15/30/50), team evenings, wrap parties, private events, logistics (parking, booking lead time, full-venue exclusivity), and food and drink including the kosher answer.

#### Scenario: New entry added

- **WHEN** a question recurs in real enquiries and is not answered on the site
- **THEN** it is added in the customer's phrasing with an answer complete on its own, factually accurate against the live offering

#### Scenario: Kashrut wording

- **WHEN** a kosher question is answered
- **THEN** the answer may say kosher-style dairy-vegetarian food is available and SHALL NOT claim a kashrut certification the venue does not hold

### Requirement: Visible FAQ and JSON stay in lockstep

Every FAQ entry SHALL exist in both the visible homepage FAQ (with its FAQPage JSON-LD) and `/ai/faq.json`, with matching content. The existing ten entries SHALL be preserved unless a fact changed.

#### Scenario: FAQ updated

- **WHEN** entries are added
- **THEN** homepage FAQ markup, FAQPage JSON-LD, and `/ai/faq.json` all contain the same set, and existing entries survive unchanged
