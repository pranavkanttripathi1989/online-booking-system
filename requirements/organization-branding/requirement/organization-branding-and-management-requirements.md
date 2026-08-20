---
id: REQ002
type: requirement
feature: organization-branding
created: 2026-08-17
updated: 2026-08-17
status: approved
parent: null
related: []
---

# Organization Branding & Management — Business Requirements

**Prepared as:** a product/business consulting recommendation for MediBook/HealthSync's Organization (tenant) domain.
**Scope:** how a clinic/practice (tenant) should be able to represent its own brand identity inside a multi-tenant SaaS, and how that capability should be packaged commercially.
**Related docs:** `context/backend-implementation-plan.md` (Phase 3.5 onboarding, entitlements, branding — technical plan this requirements doc supersedes/formalizes for the branding piece), `test-suggestion/organization-onboarding-test-suggestion.md`.

---

## 1. Why this matters (the business case)

A clinic signing up for MediBook is putting *their* name in front of *their* patients — not MediBook's. If the product looks generically "MediBook-branded" everywhere a patient touches it (booking confirmation emails, the patient portal header, invoices), the clinic's own brand gets diluted, and larger/more brand-conscious clinics (multi-location chains, premium practices) will treat that as a reason to prefer a competitor or build in-house. Conversely, branding is also one of the cleanest, lowest-engineering-cost upsell levers in SaaS pricing — nearly every reference platform below monetizes it directly.

## 2. Competitive benchmark

| Platform | What they do | Why it's relevant here |
|---|---|---|
| **Calendly / HubSpot Meetings** | Free/low tiers show the platform's own branding on booking pages and emails; paying customers unlock "remove branding" + custom colors as a distinct, explicit upgrade path. | Directly validates **branding-removal-by-tier** as a pricing lever, not just a UX nicety — this is the single most copied SaaS branding pattern and the cheapest to implement. |
| **White-label SaaS practice generally** (GoHighLevel-style platforms, multi-tenant B2B tooling) | Treat branding as a first-class architectural concern: a central settings dashboard controls logo, color scheme, and (for higher tiers) custom domain — config-driven per tenant, not a code push. Logo is uploaded once (SVG/high-res PNG) and propagated to app header, login screen, email footer, and favicon/mobile icon from a single source. | This is the concrete shape to build: one upload + one color picker, fanned out everywhere, not five separate places to configure the same thing. |
| **Practo** (India, closest direct competitor) | Corporate brand identity deliberately uses **dark/sky-blue and saffron** — calming, culturally resonant color choices for Indian healthcare, avoiding the sterile "hospital blue-green" cliché. At the practice level, the practice's own logo is treated as a core trust signal and appears everywhere alongside the practice name; Practo also watermarks logos to prevent brand misuse elsewhere. | For the Indian market specifically: (a) our *own* platform default palette should take a cue from this rather than defaulting to generic Western SaaS blues, and (b) tenant logo prominence next to the practice name is a trust cue Indian patients already expect from a market leader, so it shouldn't be a buried settings toggle — it should be visible on every patient-facing surface. |
| **Zocdoc** | Explicit profile guideline: a practice's name/logo on the platform **must match** what patients already recognize from the clinic's own signage/website/communications — consistency is a stated trust and safety requirement, not a cosmetic preference. | This should be a written validation rule for us too: don't let a clinic onboard with a placeholder/mismatched logo and leave it there — surface a nudge if branding is left at the default past onboarding. |

**Bottom line pattern across all of them:** branding = (1) one logo, (2) one or two brand colors, (3) applied everywhere automatically, (4) gated by plan tier as an upgrade lever, (5) config-driven from a single settings screen — never a developer task.

## 3. Recommended solution

### 3.1 Where it lives
Branding belongs in **Settings → Clinic** (the existing tab already holds org-level fields like Clinic Name/Address/Currency) — not in "Appearance" (that tab is the *individual user's* personal theme preference: light/dark mode, font size, accent color for their own session — a completely different concept from the *organization's* public brand identity, and conflating the two would let a single staff member's dark-mode preference accidentally look like it's changing the clinic's brand). Add a **"Branding"** section within the Clinic tab (or split into its own tab if a future org grows the settings screen further): logo upload + primary/secondary color pickers + live preview of the sidebar/header.

### 3.2 Where it propagates (single source of truth)
Store `{logo_url, primary_color, secondary_color}` in `ClientOrganizations.settings` (already a `Json` field in `schema.prisma` — no schema change needed) and fan it out to:
1. App header/sidebar (`AppShell`) — replace the hardcoded HealthSync logo/teal (`#006D77`) with the tenant's, for every role except platform super-admin views.
2. Patient-facing booking confirmation emails and reminders (Email Service, `context/backend-implementation-plan.md` Phase 9).
3. Invoices/receipts (Phase 8 billing).
4. Browser favicon/tab icon, for tenants on plans that include it.

One upload, one save action, four surfaces updated — matching the "config-driven, not code-push" principle above.

### 3.3 Commercial packaging (tie to `SubscriptionPlans`)
Following the Calendly/HubSpot pattern directly:

| Tier | Branding capability |
|---|---|
| **Starter** | Logo only. HealthSync attribution remains in email footers ("Powered by HealthSync"). |
| **Pro** | Logo + full primary/secondary color scheme. Attribution removed from patient-facing emails and the booking page. |
| **Enterprise** | Everything in Pro + custom domain for the patient booking page (e.g. `book.clinicname.com`) — the natural next step once logo+color exists, and the highest-value white-label ask enterprise chains typically make. |

This reuses the entitlements mechanism already planned (`SubscriptionPlans.features` JSON + `EntitlementsGuard`, Phase 3.5 addendum) — branding tier-gating is just another `features` flag, not new infrastructure.

### 3.4 Validation & trust (from the Zocdoc/Practo lesson)
- Server-side WCAG AA contrast check on the chosen colors against white/black text before saving (already noted in the backend plan) — reject unreadable combinations at save time.
- If a tenant is still on the default HealthSync logo/colors N days after `onboarding_status: completed`, surface a one-time dashboard nudge ("Add your clinic's logo so patients recognize you") — turns an easy-to-ignore settings field into a completed part of onboarding, mirroring Zocdoc's stated brand-consistency requirement.
- Default platform palette should lean into what Practo validated for the Indian market (calming blue + a warm accent) rather than assuming a generic Western SaaS blue-green is neutral — worth a short design pass, not a hard requirement of this doc.

### 3.5 What NOT to build yet
- Full white-label (hiding "Powered by HealthSync" entirely, custom domains) is an Enterprise-tier, later-phase feature — don't build it alongside the Starter/Pro logo+color work; sequence it behind real Enterprise-tier demand.
- Per-clinic-location branding (a multi-location org wanting different colors per branch) — none of the benchmarked platforms do this at the org level, and it adds real complexity (which color wins on a cross-location patient view?) for a need nobody has asked for yet.

---

## 4. Implementation status

- **Schema:** already supports this (`ClientOrganizations.settings Json`) — no change needed, confirmed in `context/backend-implementation-plan.md`.
- **Frontend:** Branding fields added to Settings → Clinic tab (`frontend/src/pages/settings/index.jsx`) against the mock store (`getOrganizationBranding`/`updateOrganizationBranding` in `frontend/src/mocks/store.js`, scoped by `user.organisation.id`). Verified working end-to-end via Playwright: logo upload, both color pickers, and save all function correctly.
- **Backend:** not yet built (no backend exists yet — see `context/backend-implementation-plan.md` Phase 1). The `EmailService`/`AppShell` propagation and WCAG validation described above are backend/full-integration work, tracked there.
