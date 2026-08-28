---
name: medibook-design-system
description: Use this repo's real MUI theme instead of hardcoded values when styling any React component, and understand why org branding is currently inert. Use when picking a colour, setting a font size, styling a component, adding a new screen, or working on white-labelling/branding. Triggers on "color", "colour", "hex", "#006D77", "theme", "palette", "font size", "typography", "styling", "sx prop", "branding", "white-label", "dark mode".
metadata:
  origin: project-specific
  vetted: >-
    Written 2026-08-22 from a measured audit of this repository. The
    87/122-file and 264-occurrence figures were counted directly over
    frontend/src; the REQ002 consequence was traced through the shipped
    branding feature's actual propagation path. Full audit:
    project-plans/technical-plans/06-frontend-architecture-and-mobile.md.
---

# MediBook design system

`CLAUDE.md` Hard Rule 5, theme-tokens clause.

## 1. A real theme already exists — the problem is that most files ignore it

This is important framing: this is **not** "the project has no design system".
`frontend/src/theme/index.js` exports `createAppTheme(mode)` — the single
theme factory, producing both the light and dark palettes, wired into `main.jsx`
via `context/ThemeContext.jsx`'s `ThemeModeProvider`. It defines `primary` /
`secondary` / `success` / `warning` / `error` / `text`, plus a complete
`h1`–`overline` typography scale, for both modes.

**Until 2026-08-29 there were three competing theme files** — the one now
described above, a second unused Google-blue palette (`theme/theme.js`, now
deleted), and a third, fully-built light/dark `ThemeModeProvider` that was
never actually connected to the app root, so its own header toggle button
visibly flipped state and changed nothing. All three are now one file and one
provider. If you ever find yourself about to write a second `createTheme(...)`
call anywhere outside `theme/index.js`, stop — that is exactly how this
happened the first time.

Measured reality: **87 of 122 files in `pages/` + `components/` write hex
literals anyway.** `#006D77` appears **264 times**. `#1A73E8` 101 times,
`#5F6368` 99, `#202124` 82, `#9AA0A6` 75 — every one of which has a token
equivalent already defined.

So the fix is a mechanical sweep against an existing system, not a design
exercise.

## 2. The consequence nobody expects

`REQ002` shipped real org branding: logo upload, primary/secondary colour
pickers, **server-side WCAG-AA contrast validation**, propagated into
`AppShell`'s sidebar and top nav. It works.

And it cannot re-theme the product, because 87 files ignore the theme it feeds.
An org sets its brand colour and the app stays teal.

White-labelling is a headline differentiator in both the PRD (§4.3 — "White-label
patient layer ... all under the provider's brand") and the competitive analysis
(it's the main wedge against Practo, whose patient app is Practo-branded).
**Every hex literal you add makes a shipped, paid-for feature less true.**

## 3. Use tokens

```jsx
// Wrong — bypasses the theme, breaks org branding
<Box sx={{ color: '#006D77', bgcolor: '#F8F9FA' }} />

// Right
<Box sx={{ color: 'primary.main', bgcolor: 'background.default' }} />
<Box sx={{ color: (t) => t.palette.text.secondary }} />
```

For a value with no token, add one to `theme.js` rather than inlining it. If it
appears once and is genuinely one-off decorative (a gradient stop in a marketing
hero), a literal is defensible — comment why.

## 4. Typography

The theme's scale is authoritative: `h1` 2rem → `h6` 0.9375rem, `body1`
0.9375rem, `body2` 0.875rem, `caption` 0.75rem, `overline` 0.6875rem.

Use `variant`, not `fontSize`:

```jsx
<Typography variant="body1">…</Typography>          // right
<Typography sx={{ fontSize: '0.9375rem' }}>…</Typography>  // wrong — duplicates body1
```

**Known unresolved conflict:** PRD §13 commits to "minimum 16 px base type" for
patient-facing surfaces. The theme's `body1` is 15 px and `caption` is 12 px —
**the theme is below the PRD's own floor before any component overrides it.**
Measured live: text rendering at 9.6 px, 10.4 px, 10.88 px, plus 35 instances
at 12–14 px.

Resolution requires a product decision — raise the scale for patient-facing
surfaces, or revise the PRD commitment. It is logged as an open question in
`06-frontend-architecture-and-mobile.md` §9. **Do not silently pick one**; if
you need a larger size on a patient-facing screen now, use a larger existing
variant rather than inventing a `fontSize`.

Any `fontSize` below `0.875rem` needs a comment justifying it.

## 5. Dark mode — real and app-wide as of 2026-08-29

`context/ThemeContext.jsx`'s `ThemeModeProvider` drives a real light/dark/system
toggle, read via `useThemeMode()` and wired at the app root in `main.jsx`. Every
toggle in the app (the `AppShell` header button, Settings → Appearance's Theme
radio group) reads and writes this **one** shared context — never local
`useState` — see FRONTEND_RULES.md UI-8 for why that specific mistake shipped
once already.

A hardcoded hex is invisible to it in **both** directions, and both matter
equally — this was under-stated before and is worth repeating: **background
literals AND text-colour literals are the same bug.** A literal
`bgcolor: '#FFFFFF'` renders as a stray white card on a dark screen; a literal
`color: '#202124'` renders as near-invisible dark text once its container
correctly goes dark, even if the container's own background did switch. Fixing
only one of the pair still looks broken — always convert both together:

```jsx
// Wrong — the card will flip to a dark background but the text won't,
// or vice versa; check both on any component you touch
<Card sx={{ bgcolor: '#FFFFFF' }}>
  <Typography sx={{ color: '#202124' }}>…</Typography>
</Card>

// Right — card and text both resolve against the active palette
<Card sx={{ bgcolor: 'background.paper' }}>
  <Typography sx={{ color: 'text.primary' }}>…</Typography>
</Card>
```

`#202124`/`#5F6368` are this codebase's own `text.primary`/`text.secondary`
values by convention (see `theme/index.js`) — when you see either literal,
it is always safe to replace with the matching token, not just in principle
but in this specific codebase's own numbers. Verify both modes on any screen
you touch — the fastest check is the `AppShell` header's "Dark mode" button,
not a separate dev toggle.

**Known remaining gap**: only `layouts/AppShell.jsx`'s chrome (top bar, search,
account menu, bottom nav), `pages/dashboard/index.jsx`'s header card, and
`components/Dashboard/KpiCard.jsx` were swept when dark mode shipped. The rest
of `pages/`/`components/` (the full UI-2 backlog, ~1,900 warnings) still
renders wrong in dark mode until each file's own literals are converted —
expect a stray white card or invisible text on most pages today, and treat
finding one as an invitation to fix that file's colours while you're in it,
not a surprise.

## 6. Established visual conventions

Match the surrounding file rather than introducing a new idiom:

- **Spacing** — MUI's 8 px scale via `sx={{ p: 2, gap: 1.5 }}`, not raw `px`.
- **Radius** — the codebase uses generous rounding (`borderRadius: 2`–`3`, and `'24px 0 0 24px'` on right-anchored drawers). Follow the neighbours.
- **Elevation** — `Paper` with `variant="outlined"` for content cards is the dominant pattern; reserve real elevation for overlays.
- **Status colour semantics** are already fixed by existing components (`StatusChip`, `StitchStatusChip`, `RoleBadge`) — reuse them instead of re-deriving a colour per status. Semantic colour (success/warning/error) is separate from the brand accent.

## 7. Enforcement

A `no-restricted-syntax` lint rule banning `#RRGGBB` in `pages/`, `components/`,
`layouts/` is planned (`06-frontend-architecture-and-mobile.md` §6) but blocked
behind a prerequisite: **`npm run lint` is currently broken** — the script
passes `--ext`, which the installed flat-config ESLint rejects, so it exits 1
before linting anything. Use `npx eslint <path>` directly until fixed.

## 8. Checklist

- [ ] No new `#RRGGBB` in `pages/` / `components/` / `layouts/`.
- [ ] `Typography variant`, not a raw `fontSize`.
- [ ] Verified in **both** light and dark mode.
- [ ] Reused `StatusChip` / `RoleBadge` etc. rather than re-deriving status colours.
- [ ] Spacing on the 8 px scale.
- [ ] If a token was missing, it was added to `theme/index.js`'s `createAppTheme` — not inlined.
- [ ] Any light/dark toggle reads/writes `useThemeMode()` — never local `useState`.
- [ ] Both `bgcolor`/`color` literals converted together, not just one of the pair.
