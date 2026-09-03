---
id: CTX-queue-management-2026-09-03-req186-kiosk-checkin-mode
type: improvement
feature: queue-management
created: 2026-09-03
updated: 2026-09-03
status: done
parent: REQ186
related: [PLAN255, TP275, TR275]
---

# queue-management — front-desk self-check-in kiosk mode (P2-15)

`P2-15` in `project-plans/phase-plans/02-phase2-win-the-midmarket.md`,
picked up via a bare `continue` right after `P2-14`/`REQ185` shipped.
Tracker note: "QR flow exists (`REQ107`); kiosk UI doesn't."

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ186 | [doc](../../requirements/queue-management/improvement/REQ186-queue-management-2026-09-03-kiosk-checkin-mode.md) |
| implementation-plans | PLAN255 | [doc](../../implementation-plans/queue-management/improvement/PLAN255-queue-management-2026-09-03-kiosk-checkin-mode.md) |
| test-plans | TP275 | [doc](../../test-plans/queue-management/improvement/TP275-queue-management-2026-09-03-kiosk-checkin-mode.md) |
| test-results | TR275 | [doc](../../test-results/queue-management/improvement/TR275-queue-management-2026-09-03-kiosk-checkin-mode.md) |

## What shipped

- New bare `/checkin` route (no `:token`), deliberately mounted outside
  `PublicLayout` — a shared kiosk device must not offer a way out to the
  marketing site or a staff login link, matching the existing
  `/queue/display/:clinicianId` "no chrome" precedent instead.
- `checkin.jsx`'s new `KioskCheckin` component: an idle "Scan your
  appointment QR code" screen, an always-focused hidden input capturing a
  keyboard-wedge scanner's keystrokes (no camera/QR-decode library added —
  matches how self-check-in kiosk hardware is actually deployed), token
  extraction from either the full scanned URL or a bare token, the same
  `checkInWithQrToken` mutation `REQ107` already built, and an automatic
  6-second reset to idle so a shared device never leaves one patient's
  result visible to the next person in line.
- The existing `/checkin/:token` personal-phone flow is completely
  unchanged.

## Zero backend changes

`checkInWithQrToken` (`REQ107`) already validates everything a kiosk caller
needs (single-use, time-boxed, appointment-status-aware) — this slice is
purely a new way to present the exact same mutation.

## Deliberately NOT built (recorded, not silently dropped)

- Camera-based QR decoding — real kiosk hardware is keyboard-wedge, not a
  webcam; adding a decode library would be an unjustified new dependency
  (`BASE-5`) for a deployment shape that doesn't match reality.
- A manual/typed fallback for a broken scanner — the token is a 32-byte
  cryptographic value, not human-typeable; needs its own short-code design,
  out of scope here.
- Any admin "configure this kiosk" UI — the bare `/checkin` URL is the
  entire deployment surface.

## Verification

Frontend: 9 new tests in `checkin.test.jsx` (personal flow unchanged +
2 kiosk token-extraction shapes + error + idle-reset via fake timers +
empty-scan no-op + axe-core), all passing. `eslint` clean of new errors (11
pre-existing-pattern `I18N-1` warnings, within the repo-wide lint ratchet).
`check-page-data-wiring.mjs` clean. `npm run build` and `npm run size`
green, all four budgets held. No backend change, no backend tests required.

## Next in the phase-plans spine

`P2-15` marked done in `02-phase2-win-the-midmarket.md`;
`phase-plans/README.md`'s `▶ CURRENT POSITION` advanced to `P2-16`
(self-serve reschedule link in every reminder).
