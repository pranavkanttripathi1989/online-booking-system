---
id: TP275
type: improvement
feature: queue-management
created: 2026-09-03
updated: 2026-09-03
status: approved
parent: PLAN255
related: [REQ186]
---

# TP275 — Test plan: front-desk self-check-in kiosk mode (P2-15)

Suggestion stage skipped: this is a small, additive frontend-only slice
reusing an already-proven, already-tested backend mutation (`REQ107`) with
no new contract of its own — matches this codebase's own "well-scoped slice
against an already-proven pattern" exception, per `CLAUDE.md`'s working
loop.

## `checkin.jsx`

| # | Case | Expected |
|---|---|---|
| 1 | `/checkin/:token` with a real token | Personal flow fires the mutation immediately, no scanner UI |
| 2 | `/checkin/:token`, backend rejects | Real error message shown, no scanner UI |
| 3 | `/checkin` (bare) | Kiosk idle "Scan your appointment QR code" screen, no auto-mutation call |
| 4 | Scanner input receives the full `.../checkin/:token` URL + Enter | Token extracted correctly, mutation fires with just the token |
| 5 | Scanner input receives a bare token string + Enter | Used directly as the token, mutation fires |
| 6 | Scanner input receives an already-used token + Enter | Real backend error shown |
| 7 | A result has been on screen for 6 seconds | Screen auto-resets to the idle scan-prompt, ready for the next patient |
| 8 | Enter pressed with nothing typed | No-op — stays on idle, no mutation call |
| 9 | Kiosk idle screen, `axe-core` | Zero critical/serious violations |

## Live-only checks (not meaningfully unit-testable)

- A real keyboard-wedge USB/Bluetooth barcode scanner against a running dev
  build, confirming its keystroke-then-Enter emission is captured by the
  hidden input exactly as the unit tests simulate via `fireEvent`.
- Visual/physical check that the kiosk screen reads correctly on a
  reception-mounted tablet at typical viewing distance (large icon/heading,
  no fine print).

## Not required for this slice's DoD

- Backend tests — zero backend code changed; `REQ107`'s own existing
  coverage of `checkInWithQrToken` already proves the mutation's own
  correctness end-to-end.
