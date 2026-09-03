---
id: PLAN255
type: improvement
feature: queue-management
created: 2026-09-03
updated: 2026-09-03
status: done
parent: REQ186
related: [TP275, TR275]
---

# PLAN255 — Implementation plan: front-desk self-check-in kiosk mode (P2-15)

## Frontend only — no backend track

`checkInWithQrToken` (`REQ107`) is a public, single-use, token-only mutation
that already validates everything a kiosk needs validated (token exists,
unused, unexpired, appointment status legal). There is nothing for a kiosk
caller to do differently at the resolver layer — the entire gap is presenting
that same mutation on a device meant for walk-up use rather than a personal
phone.

## `frontend/src/pages/public/checkin.jsx`

Restructured into three pieces:

- `CheckinPage` (default export, unchanged route contract) — reads
  `useParams().token`; renders `PersonalCheckin` when present,
  `KioskCheckin` when absent.
- `PersonalCheckin` — the entire pre-existing component body, verbatim, just
  renamed and given `token` as a prop instead of reading it via `useParams`
  itself. Behaviour is byte-for-byte identical to before this slice.
- `KioskCheckin` (new) — idle/scanning/result state machine:
  - A visually hidden (`opacity: 0`, zero-size, `aria-hidden`, `tabIndex={-1}`)
    `<input>` is refocused on mount, on every `blur`, and on a 1.5s safety
    interval (a patient's own stray tap elsewhere on the touchscreen must
    not permanently steal focus from the scanner).
  - `onKeyDown` treats `Enter` as "submit whatever's in the field now" —
    deliberately not a fast-typing timing heuristic to distinguish a scanner
    from a human, since this is a single-purpose device with no legitimate
    reason for free-form typing.
  - `extractToken()` — a small regex (`/\/checkin\/([^/?#\s]+)/`) pulls the
    token out of the full URL the QR actually encodes
    (`BookingStep5Confirm.jsx`'s `QRCodeSVG value`), falling back to the raw
    scanned string when it doesn't match a URL shape at all (covers a
    hypothetical bare-token QR/barcode too, at no extra cost).
  - Reuses the exact same `CHECK_IN_WITH_QR_TOKEN` mutation document
    `PersonalCheckin` already used — one GraphQL document, two call sites.
  - Result (success or error, reusing `useMutation`'s own `data`/`error`)
    renders inside a `role="status" aria-live="polite"` region (`A11Y-8` —
    dynamic updates must be announced) for 6 seconds
    (`RESET_DELAY_MS`), then `reset()` (Apollo's own mutation-state reset,
    available since Apollo Client 3.6, confirmed present at this repo's
    `^3.10.4`) clears `data`/`error` back to their initial state and the
    idle screen reappears — deliberately not a real navigation/reload,
    which would be visibly slower and unnecessary since all state here is
    local component state, not anything Apollo needs to refetch.

No new npm dependency. Every colour is a theme token
(`primary.main`/`error.main`/`success.main`/`background.default`/`divider`)
— `UI-2` clean.

## `frontend/src/App.jsx`

One new route, added directly under `<Routes>` (not nested inside
`<PublicLayout>`'s `<Route>`, and not requiring `<ProtectedRoute>` — it must
work for a logged-out walk-up patient):

```jsx
<Route
  path="/checkin"
  element={
    <Suspense fallback={<FullPageLoader />}>
      <Checkin />
    </Suspense>
  }
/>
```

Placed next to the existing `/queue/display/:clinicianId` route (same "no
AppShell/PublicLayout chrome, meant for a fixed physical screen, not staff
navigation" rationale, explicitly cross-referenced in the inline comment) —
reuses the `Checkin` lazy import that already existed for `/checkin/:token`,
so this is a route-table addition only, no new lazy chunk.

## Why outside `PublicLayout`, specifically

`PublicLayout` renders a full sticky header (logo, "Find a Doctor", "How it
Works", "Specialties", **"For Clinicians" → `/login`**) and footer. A shared
kiosk device parked at reception must not offer a way to navigate out to the
rest of the marketing site or a staff login screen — that's a real,
deliberate difference from `/checkin/:token`, which stays wrapped in
`PublicLayout` unchanged (it's opened on a patient's own phone from a
confirmation link, where that chrome is harmless and arguably useful).

## Test file (new — none existed for this page before)

`frontend/src/pages/public/checkin.test.jsx` — `MemoryRouter` +
`Routes`/`Route` for both `/checkin/:token` and `/checkin`, `MockedProvider`
for the shared mutation document. 9 tests:

1. Personal flow fires the mutation immediately from the URL token, success.
2. Personal flow surfaces a real backend error.
3. Kiosk idle screen renders with no token in the URL.
4. Kiosk extracts the token from a scanned full URL.
5. Kiosk extracts the token from a scanned bare token string.
6. Kiosk surfaces a real backend error (already-used token).
7. Kiosk resets to idle 6 seconds after a result, using `jest.useFakeTimers`.
8. Kiosk ignores an empty scan (bare Enter, nothing typed).
9. `axe-core` — zero violations on the kiosk idle screen.

## Verification

`npx eslint` on the three touched files: 0 errors, 11 warnings, all
`I18N-1` (hardcoded string, no i18n layer exists yet — a pre-existing,
already-logged, repo-wide gap per `FRONTEND_RULES.md` §22, not new debt
introduced by this slice's own design). Full `npx eslint .`: 3919 warnings,
under the `package.json` `--max-warnings 4908` ceiling — ratchet not
exceeded. `node scripts/check-page-data-wiring.mjs`: clean (1
known-fabricated, 0 new). `npm run build`: succeeds. `npm run size`: all
four budgets held (initial bundle 331.62 kB / 350 kB, largest lazy chunk
109.92 kB / 115 kB, RichTextEditor 125.05 kB / 130 kB, initial CSS 13.59 kB
/ 18 kB) — this slice added no new dependency and no new lazy chunk of its
own size, so the near-unchanged numbers are expected. `checkin.test.jsx`:
9/9 passing in isolation. Full frontend unit suite run for a full-tree
regression check — see `TR275`.
