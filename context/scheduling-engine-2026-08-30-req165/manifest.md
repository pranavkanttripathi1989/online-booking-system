---
id: CTX-scheduling-engine-2026-08-30-req165
type: improvement
feature: scheduling-engine
created: 2026-08-30
updated: 2026-08-30
status: done
parent: REQ164
related: [REQ165, PLAN224, TP244, TR244]
---

# Clinician calendar hover popover: same quick actions as the Drawer (2026-08-30)

Follow-up to `REQ164`: the user asked to also bring "Start Consultation"
and "Open Appointment Detail" to the lighter hover popover (not just the
click-through Drawer), so a clinician can act on an appointment with one
fewer click. `ApptPopover` gained its own `useNavigate()`/`hasRole()`
calls and the same `isTerminalEv` gate as the Drawer, plus two compact
buttons ("Start Consultation" / "Open Detail") above the existing "Click
to view full details →" link.

## Verification

3 new unit tests (7/7 total in the file), `eslint` 0 errors, live-verified
against the real dev stack as `clinician@medibook.dev` — hovering a real
appointment now shows both actions, and "Start Consultation" correctly
navigates to the real `EncounterWorkspace`.

## Documents

- `requirements/scheduling-engine/improvement/REQ165-*.md`
- `implementation-plans/scheduling-engine/improvement/PLAN224-*.md`
- `test-plans/scheduling-engine/improvement/TP244-*.md`
- `test-results/scheduling-engine/improvement/TR244-*.md`
