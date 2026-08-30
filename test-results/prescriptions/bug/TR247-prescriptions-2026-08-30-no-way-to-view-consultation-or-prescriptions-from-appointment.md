---
id: TR247
type: bug
feature: prescriptions
created: 2026-08-30
updated: 2026-08-30
status: pass
parent: TP247
related: [BUG056, PLAN227]
commit: pending
---

# TR247 — Consultation/prescription visibility fix outcomes

## Unit tests

`appointments/detail.test.jsx` (new): 3/3 pass.
`EncounterWorkspace.test.jsx`: 2 new tests pass; full suite 24/25 (the 1
failure — the AI Scribe voice-to-Rx test — confirmed passing 1/1 when
run in isolation, matching this session's own already-documented
contention-flaky pattern for this specific test; neither touched file is
in its dependency path).

## Static checks

`npx eslint` on all 4 touched files — 0 errors.

## Live verification (Chrome DevTools MCP, real dev stack)

As `clinician@medibook.dev`, on the real completed appointment reported
by the user (`/appointments/0c4a6cc6-6df5-4c8b-9ec7-7255c89a4225`,
Priya Patient / GP Consultation):

1. "View Consultation" button rendered on the completed appointment's
   detail page.
2. Clicked it → navigated to `/clinician/encounters/0c4a6cc6-...` — the
   real, already-signed encounter rendered fully read-only ("This
   encounter has been signed and is read-only.", all note fields
   showing their real recorded content: Chief Complaints, History,
   Examination, Vitals, Diagnosis, Follow-up).
3. New "Prescriptions" section showed a real prescription: "30/08/2026 —
   Omeprazole, Ibuprofen" with a "View" button.
4. Clicked "View" → navigated to `/prescriptions/d6e7ad6d-.../print` —
   the real prescription print page rendered correctly: patient "Priya
   Patient", clinician "Alex Clinician (MBBS, MD)", a full drug table
   (Omeprazole 10mg once daily × 10 days; Ibuprofen 2mg once daily × 15
   days), and a verification code.

## Result

**Pass.** The reported gap — no way to see what happened in a
consultation or what was prescribed, from a completed appointment — is
closed end-to-end, confirmed against real data.
