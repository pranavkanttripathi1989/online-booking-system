---
id: REQ165
type: improvement
feature: scheduling-engine
created: 2026-08-30
updated: 2026-08-30
status: done
parent: REQ164
related: [PLAN224, TP244, TR244]
---

# REQ165 — Clinician calendar: quick actions on the hover popover too

## Why this slice

`REQ164` added "Start Consultation" and "Open Appointment Detail" to the
calendar's click-through Drawer, but deliberately left the lighter hover
`ApptPopover` untouched — it still only offered "Click to view full
details →". Follow-up request: bring the same two actions to the hover
popover itself, so a clinician can act on an appointment without opening
the full Drawer at all (a genuine, requested "more user-friendly"
improvement — one fewer click for the common case).

## User story

As a clinician hovering an appointment on my calendar, I can start the
consultation or open the full appointment detail directly from the
hover card, without first clicking through to the Drawer.

## Acceptance criteria

- **AC1**: Given a clinician hovering a non-terminal appointment, then
  the popover shows "Start Consultation" (compact label; the Drawer's
  own button keeps its longer label) and "Open Detail", both above the
  existing "Click to view full details →" link.
- **AC2**: Clicking "Start Consultation" navigates to
  `/clinician/encounters/:id` for that appointment — same target as the
  Drawer's own button, same gate (`hasRole('clinician') && !isTerminal`).
- **AC3**: Clicking "Open Detail" navigates to `/appointments/:id` for
  that appointment, always visible regardless of role.
- **AC4**: A non-clinician role or a terminal-status (cancelled/
  completed/no-show) appointment hides "Start Consultation" from the
  popover, matching the Drawer's own gate exactly.

## Data model impact

None — reuses the same two routes `REQ164` already wired into the
Drawer; the popover is a second, purely additive entry point for the
same two navigations.

## Deliberately NOT built this slice

- No change to the Drawer itself (already done in `REQ164`).
- No new icon-only/compact variant beyond a shorter button label
  ("Open Detail" vs. the Drawer's "Open Appointment Detail") to fit the
  popover's 320px width — both still carry visible text, not icon-only
  (A11Y-5 concern avoided by construction, not by adding `aria-label`).

See `PLAN224` for the technical design and `TR244` for verification.
