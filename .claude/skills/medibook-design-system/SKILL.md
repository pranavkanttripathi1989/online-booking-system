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
`frontend/src/theme/theme.js` defines a named `COLORS` palette wired into
`primary` / `secondary` / `success` / `warning` / `error` / `text`, plus a
complete `h1`–`overline` typography scale.

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

## 5. Dark mode

`ThemeContext.jsx` drives a light/dark toggle. A hardcoded hex is invisible to
it — a literal `#202124` text colour stays near-black on a dark background.
This is a second, independent reason tokens matter: **every hex literal is also
a dark-mode bug.** Verify both modes on any screen you touch.

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
- [ ] If a token was missing, it was added to `theme.js` — not inlined.
