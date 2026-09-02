---
id: TR274
type: improvement
feature: clinical-records
created: 2026-09-03
updated: 2026-09-03
status: done
parent: TP274
related: [REQ185, PLAN254]
---

# TR274 — Test results: digital intake auto-populates the EMR (P2-14)

## Outcome

All 12 unit-level cases in `TP274` pass.

- `escape-html.spec.ts` (new): 5/5 passing.
- `encounters.service.spec.ts`: 81/81 passing (7 new, under `describe('intake
  auto-population (P2-14)', ...)`).

Full backend unit suite: green — **167 suites / 2658 tests**. `npx tsc
--noEmit` and `npx eslint "{src,apps,libs,test}/**/*.ts"` clean on all
touched files and the full tree.

## Live-only checks

No schema change this slice (pure new write path onto existing columns).
Container restarted after the module/service edit — recompiled clean
("Found 0 errors") after ~3 minutes under host load, booted with no errors.

Integration: full suite re-run — **13 suites / 516 tests**, all green,
including the domain's pre-existing `matrix-coverage.int-spec.ts` coverage
for `encounters` (unaffected — confirms this same-domain addition didn't
regress the already-proven cross-tenant guarantee). The pre-existing
`WebhookDispatchService` "Failed to decrypt secret" / "Invalid
authentication tag length: 0" log lines are confirmed pre-existing fixture
noise, identical to prior slices' own integration runs, unrelated to this
change.

## Live GraphQL verification (real dev stack, real data)

Authenticated as `receptionist@medibook.dev` (role `staff`) against the
running dev backend via a direct `fetch('http://localhost:4000/graphql', ...)`
call from an already-logged-in browser tab (`credentials: 'include'`, reusing
the real httpOnly session cookie).

1. Resolved real ids from the live dev data: patient
   `7ea9442e-e2c6-42a4-85b0-268e59fcb51d`, clinician
   `e1494b5d-a762-4c3b-87c2-8fa934b27398` (clinic
   `4de70a6c-f0cb-4f07-9f97-589981c24b0e`), product
   `caa89f8e-26bd-4325-9f16-df5dd7eb994e`.
2. Called `createAppointment` with `notes: 'Fever and cough
   <script>alert(1)</script> for 3 days'` — succeeded, returned a new
   appointment id, `status: 'scheduled'`.
3. Called `getOrCreateEncounter(appointment_id: <that id>)` — returned a new
   encounter (`status: 'in_progress'`) whose `notes` array contained exactly
   one entry:
   ```
   { "section": "complaints",
     "content": "<p><em>Patient-reported at booking:</em></p><p><strong>Reason for visit:</strong> Fever and cough &lt;script&gt;alert(1)&lt;/script&gt; for 3 days</p>" }
   ```
4. Confirms, against real data, in one round trip: the seed fires on
   encounter creation; the `reason` is correctly labelled and wrapped in the
   documented provenance header; the injected `<script>` tag is HTML-escaped
   (`&lt;script&gt;`), never passed through raw — closing the stored-XSS gap
   this slice's `escapeHtml()` exists to prevent.

This appointment/encounter pair is new test data created for this
verification, left in place (matching this codebase's own established
"E2E `*`-style live-test residue" precedent) — no shared fixture was
mutated or needs reverting.

## Frontend

No frontend code changed in this slice. `EncounterWorkspace.jsx`'s existing
generic per-section `RichTextEditor` (used for every `SECTIONS` entry
including `'complaints'`) requires no modification to display the seeded
note — confirmed by the live round trip above returning the note in exactly
the shape the page's own `getOrCreateEncounter` query already expects
(`notes { section content }`).

## Commits

- `bd803d3` feat(backend): auto-populate EMR chief complaints from digital intake (P2-14)
