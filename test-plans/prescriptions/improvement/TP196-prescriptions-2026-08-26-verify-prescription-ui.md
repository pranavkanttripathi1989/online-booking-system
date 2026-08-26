---
id: TP196
type: improvement
feature: prescriptions
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN176
related: []
---

# TP196 — Test plan: a real frontend surface for prescription-integrity verification

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | `?id=` pre-fill, no auto-run | Navigate to `/prescriptions/verify?id=rx-123` | `Prescription ID` field shows `rx-123`; no result shown yet (query not auto-run) |
| 2 | Verify button disabled when empty | Fresh page, no id typed | `Verify` button `disabled` |
| 3 | Valid result renders success + code | Click `Verify` with a `valid: true`, non-null `stored_hash` mock | "This prescription is authentic." shown; `Verification code on file: XXXX-XXXX-XXXX` matches the hash's formatted form |
| 4 | Invalid result renders tamper warning | Click `Verify` with a `valid: false` mock | "This prescription could not be verified." shown; "Do not rely on this copy" warning present |
| 5 | Legacy (no stored hash) renders honest state | Click `Verify` with `valid: true, stored_hash: null` | "This prescription has no verification code on file" shown; no formatted code line rendered |
| 6 | Discoverability link | `PrescriptionPrint.jsx`'s screen-only toolbar | A `Verify` button present, navigates to `/prescriptions/verify?id=<this prescription's id>` |
| 7 | `PrescriptionPrint` regression | Existing `PrescriptionPrint.test.jsx` suite | 6/6 unchanged — the new button adds no new GraphQL operation |
| 8 | Lint ratchet held | `npm run lint` before/after | 1909 warnings, 0 errors, unchanged |
| 9 | Build succeeds | `npm run build` | Clean build |
