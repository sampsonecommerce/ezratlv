## Purpose

Which Monday files the public image proxy may serve, so a public URL can never expose a customer document.

## ADDED Requirements

### Requirement: The image proxy serves only public media

`?eventImage=<assetId>` SHALL serve an asset only if it is attached to a schedule-board item whose `אתר` reads `פורסם באתר`, or to a subitem of a schedule-board item whose `אישור תוכן` reads `מאושר`. Any other id SHALL get 404, decided before the worker requests the asset's download URL and before the edge cache is consulted.

#### Scenario: Guessing a proposal's id

- **WHEN** someone requests `?eventImage=` with the id of a signed proposal on Open Events
- **THEN** the response is 404 and the worker never asks Monday for that file's URL

#### Scenario: A live card

- **WHEN** the events page loads a card image from an item marked `פורסם באתר`
- **THEN** the image is served as before
