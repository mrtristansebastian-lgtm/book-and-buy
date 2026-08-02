# 0002 - Schedule Operations Board

**Status:** accepted
**Date:** 2026-08-02
**Deciders:** Product and engineering

## Context

The schedule previously coupled calendar presentation, availability interpretation, booking grouping, and editing inside one large workspace component. The owner-facing Week view reduced each day to tiny status counters, while the Day view became horizontally clipped on mobile. Appointment conflicts only caught one narrow same-start-time case.

## Decision

Keep the existing booking, settings, sync, save, and chat handlers, but place a UI-independent normalized schedule model in front of a new Operations Board. The board defaults to the business Day view and offers staff scope switching, a day timeline, Week planning cards, a Month workload pulse, and an agenda.

Bookings are managed through the right-side command panel. Moving an appointment is a deliberate date/time edit in that panel; drag-and-drop is not introduced. Availability ranges, status normalization, waitlists, overlaps, and conflict detection are calculated in the model layer before rendering.

## Consequences

- The current data and handler contracts stay intact; no backend or public API migration is required.
- Day, Week, Month, and mobile layouts consume one normalized source of truth.
- Interval overlap checks prevent conflicting staff appointments before saving.
- The native animated accent is limited to active period controls, primary actions, and selected/focus rings.
- The old schedule presentation helpers remain temporarily in the workspace file while the new board is adopted, so they can be removed in a focused cleanup once no longer referenced.

## Alternatives Considered

Keeping the staff-by-day counter matrix would retain familiar code but would not give businesses a useful operational overview. Drag-and-drop was rejected because it makes accidental schedule moves more likely and complicates conflict resolution. Replacing the booking handlers was rejected because the current save, Google sync, settings, and chat flows already provide the required integrations.
