---
id: REQ186
type: improvement
feature: queue-management
created: 2026-09-03
updated: 2026-09-03
status: done
parent: REQ107
related: [PLAN255, TP275, TR275]
---

# REQ186 — Front-desk self-check-in kiosk mode

## Source

`P2-15` in `project-plans/phase-plans/02-phase2-win-the-midmarket.md`, next
unstarted slice per `phase-plans/README.md`'s own `▶ CURRENT POSITION`,
picked up via a bare `continue`. Tracker note: "QR flow exists (`REQ107`);
kiosk UI doesn't."

Verifying against the real code (the `continue` protocol's own step 4)
confirmed the gap exactly as stated: `checkInWithQrToken` and
`/checkin/:token` already exist and work, but only for a patient's **own
phone** scanning a QR from their confirmation and navigating straight to
that URL. Nothing renders a screen meant for a **shared, walk-up device at
reception** — the tracker's "kiosk UI."

## What this ships

- **`/checkin` (bare, no `:token`)** — a new route, deliberately mounted
  *outside* `PublicLayout`, matching the existing `/queue/display/:clinicianId`
  "no chrome" precedent rather than the marketing-header-and-footer one: a
  shared front-desk device must not offer a "For Clinicians" login link or
  marketing nav out to the rest of the public site.
- **`checkin.jsx`'s new `KioskCheckin` component** — an idle "Scan your
  appointment QR code" screen with an always-focused, visually hidden text
  input that captures a scanner's keystrokes, submitted on the scanner's own
  trailing Enter (standard keyboard-wedge barcode/QR scanner behaviour — no
  camera, no QR-decode library added). The token is extracted from either
  the full `.../checkin/:token` URL the QR actually encodes
  (`BookingStep5Confirm.jsx`) or a bare token string, then passed straight
  into the same `checkInWithQrToken` mutation `REQ107` already built and
  tested — **zero backend changes** in this slice.
- **Auto-reset to idle.** A shared device must never leave one patient's
  result on screen for the next person in line — success/error is shown for
  6 seconds, then the screen clears itself and re-focuses the scanner input,
  ready for the next walk-up patient with no staff intervention.
- The existing `/checkin/:token` personal-phone flow is **completely
  unchanged** — same component, same behaviour, still auto-checks-in the
  instant it mounts with a token already in the URL.

## Deliberately NOT built (recorded, not silently dropped)

- **Camera-based QR decoding.** A real self-check-in kiosk's scanner is
  standard, cheap keyboard-wedge hardware (types the scanned string as if
  from a keyboard, no `getUserMedia` permission prompt, no new bundle
  dependency per `BASE-5`) — not a webcam pointed at a QR code. This is the
  deployment reality this slice targets, not a corner cut.
- **Manual/typed fallback for a broken scanner.** The token is a 32-byte
  cryptographic value, far too long for a person to type accurately; a
  human-enterable fallback would need its own short-code scheme, a separate
  design decision out of scope here. A patient without a working scanner is
  checked in manually by staff, same as today.
- **Any staff-facing "set up this kiosk" admin UI.** The bare `/checkin`
  URL is the entire deployment surface — point the device's browser at it.

## Acceptance criteria

**US-QUE-07**: As front-desk staff, I can point a shared device at
`/checkin` and have it work as an unattended self-check-in kiosk.
- Given the bare `/checkin` route with no token, when it renders, then it
  shows the idle scan-prompt screen, never the personal-phone flow's
  immediate check-in attempt.
- Given a scan (keystrokes ending in Enter) containing the full QR URL, when
  submitted, then the token is correctly extracted and the same
  `checkInWithQrToken` mutation fires.
- Given a scan containing just the bare token, when submitted, then it is
  used directly with no URL-parsing false negative.
- Given a result (success or error) has been shown, when 6 seconds pass,
  then the screen returns to the idle scan-prompt state automatically, with
  no residual data from the prior patient visible.

**US-QUE-08**: The existing personal-phone QR flow is unaffected.
- Given `/checkin/:token` with a real token in the URL, when it mounts,
  then it behaves exactly as it did before this slice (immediate
  check-in attempt, `Back to home` button, no scanner-input UI).

## Data model impact

None — this is a pure frontend addition onto the existing
`checkInWithQrToken` mutation and `Appointments.checkin_token*` columns
`REQ107` already built.

## Verification

Frontend: 9 new tests in `checkin.test.jsx` (both the pre-existing personal
flow and the new kiosk flow, plus a token-extraction case for each of the
two scanned-string shapes, an idle-reset case using fake timers, an
empty-scan no-op case, and an `axe-core` zero-violations check on the kiosk
idle screen). `npx eslint` clean of new errors (11 pre-existing-pattern
`I18N-1` warnings, within the repo's lint ratchet — `no i18n layer exists
yet`, a standing, already-logged gap, not new debt from this slice).
`node scripts/check-page-data-wiring.mjs` clean. `npm run build` and
`npm run size` both green, all four bundle budgets held. No backend change,
so no backend test run required. See `TR275` for full detail.
