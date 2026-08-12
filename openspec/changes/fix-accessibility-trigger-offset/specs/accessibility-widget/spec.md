# accessibility-widget

## Purpose

Defines how the third-party accessibility helper behaves on the public Ezra
site: it stays closed until a visitor asks for it, its trigger stays reachable
on every viewport we serve, and a visitor who does not want it can dismiss it
for the session. The site's own accessibility and the published statement carry
the IS 5568 obligation; this capability keeps the optional helper from becoming
an obstacle in its own right.

## ADDED Requirements

### Requirement: Panel stays closed until invoked

The accessibility panel SHALL be fully outside the viewport until the visitor
activates the trigger. No part of the panel may be visible on page load, at any
viewport size, in any language variant.

Site-level styling MUST NOT alter the geometry the vendor uses to park the
closed panel. The vendor pairs a bottom offset with an equal-and-opposite
vertical translation, and the two must continue to cancel exactly.

#### Scenario: Load on a short viewport

- **WHEN** a visitor loads a page carrying the widget at a viewport height of
  760px or less
- **THEN** the panel's top edge SHALL be at or below the bottom edge of the
  viewport
- **AND** no strip of the panel SHALL overlap the cookie bar, the footer, or
  any page content

#### Scenario: Load on a tall viewport

- **WHEN** a visitor loads a page carrying the widget at a viewport height
  above 760px
- **THEN** the panel SHALL be positioned exactly as on a short viewport:
  entirely off screen

#### Scenario: Visitor opens the panel

- **WHEN** the visitor activates the trigger
- **THEN** the panel SHALL open to its full height and remain usable
- **AND** closing it SHALL return it entirely off screen

### Requirement: Trigger stays inside the viewport

The trigger SHALL be fully visible and clickable on every viewport the site
serves, including viewports short enough that the vendor's own layout would
place it below the fold.

The correction SHALL be derived from the trigger's measured position rather
than a hardcoded offset, because the overhang is a function of vendor-internal
values (panel height and the trigger's offset within it) that can change
without notice.

#### Scenario: Vendor layout pushes the trigger below the fold

- **WHEN** the widget mounts and the trigger's bottom edge falls below the
  viewport's bottom edge
- **THEN** the trigger SHALL be lifted until it is fully within the viewport
- **AND** the panel's closed position SHALL be unaffected

#### Scenario: Trigger already visible

- **WHEN** the widget mounts and the trigger is already fully within the
  viewport
- **THEN** no correction SHALL be applied

#### Scenario: Viewport is resized or rotated

- **WHEN** the viewport height changes after the widget has mounted
- **THEN** the trigger SHALL be re-evaluated and remain fully visible

#### Scenario: Vendor changes its layout

- **WHEN** the vendor's markup or geometry changes such that the trigger cannot
  be located
- **THEN** the site SHALL leave the widget untouched rather than apply a
  correction based on stale assumptions

### Requirement: Visitor can dismiss the widget for the session

A visitor SHALL be able to hide the widget for the remainder of their browsing
session without it reappearing on navigation.

#### Scenario: Visitor dismisses the widget

- **WHEN** the visitor activates the dismiss control
- **THEN** both the widget and the dismiss control SHALL be hidden
- **AND** the widget SHALL stay hidden on subsequent page loads within the same
  session

#### Scenario: Widget never mounts

- **WHEN** the vendor script fails to mount, for example where an in-app
  browser blocks storage
- **THEN** no dismiss control SHALL be left on the page

### Requirement: Language variants behave identically

Every page carrying the widget SHALL apply the same behaviour, in both the
Hebrew and the English page sets.

#### Scenario: A page carries the widget

- **WHEN** any page loads the vendor script
- **THEN** it SHALL also carry the closed-state and trigger-visibility
  corrections defined above
- **AND** a change to one language variant SHALL be mirrored in its counterpart
