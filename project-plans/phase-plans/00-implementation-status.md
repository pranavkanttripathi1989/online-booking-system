---
id: PP-STATUS
type: status
feature: project-plans
created: 2026-08-27
updated: 2026-08-27
status: living
---

# 00 — Implementation status, measured

**Everything here was measured against the repo on 27 Aug 2026.** Not inherited
from a prior doc. When this drifts, re-measure with the commands in §5 rather
than editing prose.

This supersedes the state tables in `analysis/01-codebase-analysis.md` and
`analysis/07-prd-gap-analysis-and-roadmap.md`, both of which are point-in-time
and both of which admit drift in their own headers.

---

## 1. Scale

| | Backend | Frontend |
|---|---|---|
| Domain modules / pages | **53** domains, 51 resolvers | **93** pages, 44 components |
| Data layer | **100** Prisma models, **71** migrations | Apollo Client, 1 cache |
| Tests | **93** suites / **1,565** unit · 4 suites / **387** integration | 29 suites / 200 unit · **45** Playwright specs |
| Language | TypeScript (strict null checks) | **JavaScript / JSX — 170 `.jsx`, 0 `.ts`** (deliberate, `FRONTEND_RULES.md` BASE-3) |
| CI gates | unit, integration, schema drift, eslint, tsc | eslint (ratcheted 1,906), unit, build, page-data-wiring |

---

## 2. Module state — back end and front end, side by side

Legend: **●** solid · **◐** partial, named gap · **○** absent/stub · **🔒** blocked

| PRD module | BE | FE | Front-end surface | Real remaining gap |
|---|:--:|:--:|---|---|
| M1 Org & tenancy | ● | ● | `admin/Organizations`, `manager/clinics`, `admin/Payers` | — |
| M2 Identity & security | ● | ◐ | `auth/*`, `admin/users`, `admin/Roles` | **SEC-2: token in `localStorage`** |
| M3 Master data | ● | ● | `manager/{services,products,packages}` | — |
| M4 Scheduling | ● | ● | `calendar`, `availability`, `manager/resources` | Hybrid interleaving relies on a heuristic (open-q #17) |
| M5 Booking | ● | ● | `booking`, `appointments/{index,create,edit,detail}` | **No server-side slot hold (BOOK-2)**; no idempotency key (BOOK-3) |
| M6 Queue | ● | ● | `queue` (347), `waiting-room` (230) | Predictive ETA; kiosk mode |
| M7 EMR | ● | ● | `clinician/EncounterWorkspace` (1,061) | ICD-10 coding; investigation orders |
| M8 Prescriptions | ● | ● | `prescriptions/{PrescriptionPrint,Verify}` | Regional-language print; TPG drug list |
| M9 Pharmacy | ● | ● | `manager/pharmacy` (788) | Purchase orders/GRN; forecasting |
| M10 Billing | ● | ● | `finances` (753), counter payment dialogs | GST e-invoicing (IRP); Tally sync |
| M11 Messaging & notifications | ● | ● | `messages` (974), `notifications`, `settings` tabs | **Template-category routing (margin, deadline 1 Oct)** |
| **M12 Telemedicine** | ○ | ○ | `video` (491) — **WebRTC is simulated** | Whole module. Its own code says *"normally this would be handled by WebRTC RTCPeerConnection"* |
| M13 Patient portal | ● | ◐ | `patient/Family`, `profile`, portal tabs | Offline (DATA-8); i18n; PWA |
| **M14 ABDM / interop** | ○ | ○ | none | **Whole module. Zero files match ABHA/ABDM/NHCX/FHIR** |
| M15 Reports | ● | ● | `analytics` (335), `manager/reports` | Cash-flow forecast |
| M16 Integrations | ● | ● | `settings` → Integrations tab | Partner marketplace; UHI |
| M17 Insurance | ◐ | ◐ | `manager/claims` (369), patient Insurance tab | OPD subset only. NHCX; denial analytics; agentic claim |
| S10 Plan engine | ◐ | ◐ | `admin/Plans` (284) | **Entitlement guard absent — tiers unmonetisable** |
| S12 DPDP | ◐ | ◐ | `admin/RightsRequests`, Privacy tab | Retention for `clinical_records`/`messages` (open-q #18) |
| M18 AI clinical | ○ | ○ | none | Net-new — PRD v2 §7 |
| M19 AI front desk | ○ | ○ | none | Net-new — PRD v2 §7 |
| M20 Growth & reputation | ○ | ○ | `reviews` (read-only) | **No review creation path at all** |
| M21 Interop platform | ○ | ○ | none | Net-new — PRD v2 §7 |

**Read this honestly.** 15 of 22 rows are solid on both tracks. That is a real
platform. The gaps cluster into exactly four places:

1. **Two whole modules absent** (M12 telemedicine, M14 ABDM) — both on the
   critical path per PRD v2 §3.
2. **Four net-new modules** (M18–M21) — the AI and interop bets.
3. **Three revenue/security blockers** hiding inside otherwise-solid modules:
   entitlement guard (no tier revenue), SEC-2 token storage (security),
   template-category routing (margin, dated deadline).
4. **Frontend platform debt** that no single module owns — §3.

---

## 3. Frontend platform debt

None of this belongs to a feature, so no feature slice ever fixes it. It needs
its own slices. Full per-rule audit: `technical-plans/07-frontend-rules-compliance.md`.

| Item | Measured | Rule | Cost of delay |
|---|---|---|---|
| **i18n layer** | **Does not exist.** Zero i18n dependency | I18N-1…10 | Grows with every commit. `FRONTEND_RULES` §20.1 names it the single largest latent frontend cost |
| Hardcoded colours | **1,906** lint warnings | UI-2 | Per-tenant branding is inert; dark mode impossible |
| Oversized files | **68** files > 250 lines; largest **1,641** (`settings/index.jsx`) | UI-14 | Review quality; every touch is risky |
| Auth token storage | `localStorage` / `sessionStorage` | **SEC-2** | **Open security gap** |
| Bundle budgets | No `size-limit`; largest chunk 441 KB (`mui`) | PERF-1…4 | Unmeasured — cannot claim any PERF compliance |
| Slot hold | Not implemented | **BOOK-2** | Double bookings. The rule doc calls this the fastest way to destroy clinic trust |
| Idempotency keys | Not implemented on booking mutations | **BOOK-3** | Duplicate appointments on double-tap / flaky network |
| Offline behaviour | Not designed | DATA-8 | Patient standing outside a clinic with no signal sees nothing |
| CI gates missing | prettier, size-limit, Lighthouse, axe, visual-regression, translation coverage, secret scanning | CI-3,5,6,7,8,10,11,12 | Most `FRONTEND_RULES` rules are unenforced, therefore optional in practice |
| e2e not in CI | 45 specs, deliberately ungated (shared dev DB, leaves residue) | CI-9 | The one suite that would catch cross-track breakage never gates a merge |
| No Capacitor shell | No `capacitor.config.*`, no `src/platform/` | WV-* 🔜 | 18 mobile rules unenforceable; "same build, one bundle" (BASE-1) untested |

### One pending-stale exemption, worth fixing before it bites

`scripts/check-page-data-wiring.mjs`'s `ALLOWED` list exempts
`tasks/index.jsx` on the grounds that *"no backend domain exists yet"*. A
`tasks` backend module now exists in the working tree (uncommitted, from
parallel work). **The moment that lands, this exemption is false** and the gate
will pass a page it should now flag. This is precisely the failure mode
`FRONTEND_RULES` CI-19 exists for — a gate's exemption list is only as current
as the last time someone re-read the file it exempts. Re-verify when `tasks`
merges.

---

## 4. What "done" has actually meant historically

Useful context for estimating, and a caution the phase plans are built around.

- **Roughly 143 requirement documents** (`REQ001`–`REQ143`) have shipped, in
  batches of 8–14 slices.
- **Two batches shipped backend-only** (Phase G+2, G+3 — 8 slices each). Both
  needed a dedicated frontend catch-up pass afterwards, and both catch-up
  passes found real bugs that existed *only because* the halves shipped apart:
  a mutation whose GraphQL argument shape was wrong from the day it shipped
  (feature never once functional), routes gated to roles their own resolvers
  allowed, a button its own success handler made unreachable.
- **This is why `phase-plans/README.md` makes parallel tracks a rule.** The
  evidence is in this repo's own history, not borrowed from elsewhere.

---

## 5. How to re-measure

Run these rather than trusting the numbers above once they age:

```bash
# backend scale
find backend/src -maxdepth 2 -name "*.module.ts" | sed 's|.*/src/||;s|/.*||' | sort -u | wc -l
grep -c "^model " backend/prisma/schema.prisma
ls backend/prisma/migrations | grep -c "^2"
cd backend && npx jest --maxWorkers=2 2>&1 | tail -5 && npm run test:int 2>&1 | tail -5

# frontend scale + debt
cd frontend
find src -name "*.jsx" ! -name "*.test.jsx" | wc -l
npm run lint 2>&1 | tail -3                       # UI-2 ratchet
find src -name "*.jsx" ! -name "*.test.jsx" -exec wc -l {} + | awk '$1>250' | wc -l   # UI-14
ls src/platform 2>/dev/null || echo "no platform wrapper (WV-*)"
grep -c i18next package.json || echo "no i18n (I18N-1)"

# the two absent modules
grep -rl "ABHA\|ABDM\|NHCX\|FHIR" backend/src frontend/src | wc -l    # expect 0
grep -n "RTCPeerConnection" frontend/src/pages/video/index.jsx        # expect a "simulated" comment

# live, dated test counts
node scripts/test-count-status.mjs
```
