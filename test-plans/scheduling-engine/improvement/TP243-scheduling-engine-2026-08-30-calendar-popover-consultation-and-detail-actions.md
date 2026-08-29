---
id: TP243
type: improvement
feature: scheduling-engine
created: 2026-08-30
updated: 2026-08-30
status: approved
parent: PLAN223
related: [TR243]
---

# TP243 — Clinician calendar Drawer actions verification

Test-suggestion stage skipped per Hard Rule 4 — a routine, additive UI
change against an already-proven pattern (`appointments/detail.jsx`'s own
"Start Consultation" button), not an exploratory/ambiguous feature.

## Frontend unit tests (`Calendar.test.jsx`, new file)

1. A clinician viewing a non-terminal (`confirmed`) appointment sees
   "Start Consultation" and clicking it navigates to
   `/clinician/encounters/:appointmentId` for that real appointment id.
2. Any role sees "Open Appointment Detail" and clicking it navigates to
   `/appointments/:id` for that real appointment id.
3. A non-clinician role does not see "Start Consultation" at all.
4. A terminal-status (`completed`) appointment hides "Start Consultation"
   even for a clinician, while "Open Appointment Detail" stays visible.

Uses the marker-route pattern already established in
`EncounterWorkspace.test.jsx` — a lightweight `useLocation()`-reading
component mounted at each destination route, asserted via `data-testid`,
so the test proves a real navigation happened without mounting the full
weight of either real destination page.

## Static checks

- `npx eslint` on the touched file — 0 new errors.
- `npm run lint` (full project) — warning count stays under the 4908
  ratchet.
- `npm run build` — clean compile.
- `npm run size` — all 4 budgets remain green (frontend-only change, no
  new dependency).

## Live verification (manual, real dev stack)

Open `/clinician/calendar` as a real seeded clinician, click a real
non-terminal appointment card to open its Drawer, confirm both new
buttons render in the expected order/hierarchy, click "Start
Consultation" and confirm it lands on the real `EncounterWorkspace` for
that appointment; return, click "Open Appointment Detail" and confirm it
lands on the real `/appointments/:id` page with matching data. Repeat
once against a `completed` appointment to confirm "Start Consultation"
is correctly absent while the other two actions remain.

No backend test plan — this slice makes no backend change (see `REQ164`
AC5).
