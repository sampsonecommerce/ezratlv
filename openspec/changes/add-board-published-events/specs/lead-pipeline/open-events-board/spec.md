# Open Events board

## ADDED Requirements

### Requirement: The board carries the public face of an event, behind one checkbox

The Open Events board SHALL carry, per item, a `Publish to site` checkbox
(`boolean_mm6k8swg`) and the public copy it gates: title (`text_mm6kpbzk`),
subtitle (`text_mm6k9g72`), description (`long_text_mm6kwzwk`), images
(`text_mm6km603`, comma-separated repo-relative paths), link (`link_mm6k9nqy`),
entry type (`color_mm6kapv3`) and seating rounds (`text_mm6ktfbq`).

The checkbox SHALL default to unticked, and an unticked item SHALL publish
nothing: no field of it may reach any public surface.

#### Scenario: A committed private booking

- **WHEN** an item sits in a committed group with `Publish to site` unticked
- **THEN** the public feed carries no title, notes, name or any other field of
  that item
- **AND** the item's date still reads as taken

#### Scenario: The publish column is missing entirely

- **WHEN** the checkbox column is absent from an item or from the board
- **THEN** the item is treated as unticked

### Requirement: The mirror sync never writes publish columns

The mirror sync SHALL NOT set or clear any publish column, so hand-written
public copy survives every sync pass unchanged.

#### Scenario: A sync pass over a published event

- **WHEN** the sync updates a mirror item whose publish columns are filled
- **THEN** every publish column holds the same value after the pass as before
