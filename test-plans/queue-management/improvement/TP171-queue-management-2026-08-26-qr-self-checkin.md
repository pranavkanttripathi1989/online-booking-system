---
id: TP171
type: improvement
feature: queue-management
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN147
related: [REQ107]
---

# TP171 — Test plan: QR self-check-in for booked appointments

Skipping the test-suggestion stage per `CLAUDE.md`'s conditional rule —
additive extension reusing an already-proven pattern (`auth.service.ts`'s
password-reset-token shape).

## Cases

| # | Case | Expected |
|---|---|---|
| 1 | `create()` for a no-prepayment service | Stores `checkin_token_hash`, not the raw token; response's `checkin_token` field carries the raw token, distinct from the hash |
| 2 | `create()`'s `checkin_token_expires_at` | End of the appointment's own calendar day in IST |
| 3 | `create()` for a prepayment-`required` service | No token generated (`checkin_token_hash` undefined, response's `checkin_token` undefined) |
| 4 | `checkInWithQrToken` — never-issued token | Rejected identically to "not found" — no distinguishable error for a syntactically valid but unknown token |
| 5 | `checkInWithQrToken` — happy path | Transitions to `checked_in`, queue entry synced, token marked used, `changed_by_user_id: null` |
| 6 | `checkInWithQrToken` — already-used token | Rejected, distinct message from "not found"/"expired" |
| 7 | `checkInWithQrToken` — expired token | Rejected, distinct message from "already used" |
| 8 | `checkInWithQrToken` — cancelled/completed/no_show appointment | Rejected, status-specific message; the appointment's current status is authoritative over the token's own validity |
| 9 | `checkInWithQrToken` resolver signature | Takes only `token: String!` — no `appointment_id`/`patient_id` argument exists to supply |
| 10 (integration) | `matrix-coverage.int-spec.ts` | Stays green with no new `EXEMPT`/`CASES` entry — the mutation lives inside the already-`appointments`-covered resolver directory |
| 11 (frontend) | `BookingStep5Confirm.jsx`'s success screen | Renders a QR code encoding `/checkin/:token` when the mutation response carries a `checkin_token`; renders nothing when it doesn't (prepayment-required booking) |
| 12 (frontend) | `/checkin/:token` public route | Fires `checkInWithQrToken` on mount with no login required; shows a success or a specific rejection message |
| 13 (adjacent finding) | `npm run lint` gate | Passes (nonzero-exit regression from an earlier slice in this batch, found and fixed) |
