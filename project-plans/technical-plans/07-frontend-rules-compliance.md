---
id: TP007
type: technical-plan
feature: project-plans
created: 2026-08-27
updated: 2026-08-27
status: active
parent: FRONTEND_RULES.md
---

# 07 — `FRONTEND_RULES.md` compliance audit

Per-rule-family audit of `FRONTEND_RULES.md` v2.0 against the codebase,
measured **27 Aug 2026**. This is the bridge between the rules document (which
states what *should* be true) and `phase-plans/00-implementation-status.md`
(which states what *is*).

`FRONTEND_RULES.md` §22 carries the short waiver register. **This document is
the long form** — the evidence, the enforcement mechanism, and who closes it.

---

## 1. Scoring

| Status | Meaning |
|---|---|
✅ **Compliant** | Measured true, and something prevents regression
⚠️ **Compliant, unenforced** | Measured true today, but nothing stops it breaking tomorrow
🟠 **Ratcheted** | Not compliant, but the debt is measured and can only shrink
🔴 **Gap** | Not compliant, no mechanism, needs a funded slice
⚪ **Waived** | Deliberately not compliant — decision recorded
🔜 **Conditional** | Governs a surface that does not exist yet

**⚠️ is the dangerous column.** A rule that is true by accident is one refactor
away from false, and nobody will notice.

---

## 2. Audit by rule family

### §2 Tech baseline

| Rule | Status | Evidence | Enforcement |
|---|:--:|---|---|
| BASE-1 one build | 🔜 | No mobile shell | — |
| BASE-2 platform wrapper | 🔜 | No `src/platform/` | — |
| **BASE-3 language** | ⚪ | **170 `.jsx`, 0 `.ts`** | **Waived — deliberate.** Compensating controls (a)–(e), BASE-10, ARCH-7 become mandatory |
| BASE-4 one of each | ⚠️ | MUI + Apollo + dayjs + zod + react-hook-form + notistack, no duplicates found | No lint rule blocks a second library |
| BASE-5 dep size gate | 🔴 | No size check in CI | Needs CI-12 |
| BASE-6 locked toolchain | ✅ | `package-lock.json` committed, CI uses `npm ci` | CI |
| BASE-7 browserslist floor | 🔴 | Not pinned — Vite defaults decide the support matrix | Pin in `package.json` |
| BASE-8 validated env | 🔴 | `import.meta.env` read directly, no boot validation | zod schema at boot |
| BASE-9 no secrets in bundle | ⚠️ | None found | Needs CI-11 secret scanning |
| **BASE-10 prop contracts** | 🔴 | No `propTypes`, no JSDoc convention in `src/components/` | **The BASE-3 trade requires this.** New rule in v2.0 |

**The BASE-3 bargain is currently unpaid.** Choosing JS over TS is legitimate,
but only if (a)–(e), BASE-10 and ARCH-7 are real. Two of the three are 🔴.
This is the highest-priority item in this document.

### §3 Performance

| Rule | Status | Evidence |
|---|:--:|---|
| PERF-1…4 budgets | 🔴 | No `size-limit`. Largest chunk **441 KB** (`mui`), then `charts` 410 KB, `DataGrid` 328 KB. **Unmeasured against budget** |
| PERF-5…8 field metrics | 🔴 | No Lighthouse CI |
| PERF-9 lazy routes | ✅ | `App.jsx` lazy-loads its route tree |
| PERF-10/11 MUI + icon imports | ⚠️ | Direct-path imports observed | No `no-restricted-imports` rule |
| PERF-12 heavy widgets lazy | ✅ | `DataGrid`, `charts`, `DateCalendar` are separate chunks |
| PERF-13…17 | 🔴 | Unmeasured |
| PERF-16 virtualisation | 🔴 | `finances/index.jsx` renders all transactions with `.map()`, no windowing — a live instance |

**Note:** the three largest chunks are all vendor. PERF-3's 350 KB
desktop budget is already exceeded by `mui` alone, so PERF-1's 180 KB patient
budget cannot be met without surface bundle separation (ARCH-4). Those two rules
are the same problem.

### §4 Design system

| Rule | Status | Evidence |
|---|:--:|---|
| UI-1 theme is truth | ⚠️ | `src/theme/` exists and is real |
| **UI-2 no hardcoded colour** | 🟠 | **1,906** lint warnings | `no-hardcoded-colors` ESLint rule + `--max-warnings` ratchet. **Working as designed** — visible, capped, only shrinks |
| UI-3 no px spacing | 🔴 | Not linted |
| UI-4…13 | ⚠️ | Theme has tokens; no rule blocks bypass |
| **UI-14 ≤250 lines** | 🟠 | **68 files** over 250; largest **1,641** (`settings/index.jsx`), then 1,387 / 1,247 / 1,230 | No lint rule |

`UI-2`'s ratchet is the pattern to copy for every other 🟠 item — it is the one
mechanism in this repo that has demonstrably held debt flat while allowing work
to continue.

### §5 Responsive

| Rule | Status | Evidence |
|---|:--:|---|
| RES-1/2 mobile-first @320px | 🔴 | Untested at 320. Tiering model exists in `06-frontend-architecture-and-mobile.md` |
| **RES-3 no body h-scroll** | ⚠️ | Fixed three times historically; two instances found by accident | **`scrollWidth > clientWidth` provably misses this** — use the element-level probe in `06` §7 |
| RES-4 theme breakpoints only | 🔴 | Not linted |
| RES-5 48px touch targets | 🔴 | Unmeasured |
| RES-6 ≥16px body | 🔴 | Unmeasured |
| RES-10 width matrix | 🔴 | No visual-regression CI (CI-8) |
| RES-11 200% font scaling | 🔴 | Untested |

### §6 Mobile shell — all 🔜 except

| Rule | Status | Note |
|---|:--:|---|
| WV-5 no `alert`/`confirm` | ⚠️ | Applies **today** — not linted |
| WV-6 no `window.open` core flows | ⚠️ | Applies today |
| WV-13 no `:hover` on touch | 🔴 | Applies today, not gated behind `@media (hover: hover)` |
| WV-16 offline banner | 🔴 | Applies today — none exists |
| WV-17 no silent web-only | ⚠️ | Applies today |
| WV-1…4, 7…12, 14, 15, 18 | 🔜 | No Capacitor shell. Activated by `phase-plans` P3-11 |

### §7–§8 Navigation & booking

| Rule | Status | Evidence |
|---|:--:|---|
| NAV-4 browse without login | ✅ | Public booking works logged-out (`OptionalAuthShell`, `RootRoute`) |
| NAV-12 every screen URL-addressable | ⚠️ | True, but a **pathless layout route once silently claimed `/`** and made the landing page unreachable for everyone. Rule now carries that warning |
| **BOOK-2 server-side slot hold** | 🔴 | **Not implemented.** Rules doc calls this the fastest way to destroy clinic trust | `phase-plans` P1-05 |
| **BOOK-3 idempotency key** | 🔴 | **Not implemented** | P1-05 |
| BOOK-4 disable on first tap | ⚠️ | Present in places, not systematic |
| BOOK-5 fee before selection | ⚠️ | Price shown; full itemised total pre-payment unverified |
| BOOK-9 IST display / UTC wire | ⚠️ | Convention followed. **Known trap:** fixed local-clock-hour `setHours()` fixtures are timezone-ambiguous on an IST host — bit a real e2e spec |
| **BOOK-12 queue position / wait** | ◐ | Queue board + retrospective average built; **live patient-facing ETA not surfaced** | The doc's own "if you ship one differentiator, ship this one" |
| BOOK-16 multi-patient | ✅ | Family/dependants shipped (`REQ018`) |
| BOOK-17 WhatsApp share | ✅ | OTP-gated Rx share shipped (`REQ109`) |
| BOOK-19 never optimistic | ⚠️ | Followed; not enforced |
| BOOK-20 paid-but-unconfirmed recovery | 🔴 | **State not built.** Rule says it must be built and tested, not left to chance |

### §9 Forms

| Rule | Status | Evidence |
|---|:--:|---|
| FORM-2 persistent labels | ⚠️ | MUI default |
| **FORM-7 validation timing** | ⚠️ | **Known trap, shipped once:** react-hook-form's default `mode: 'onSubmit'` means `formState.errors` never populates without a `handleSubmit` call — a step with no submit button had dead validation UI wired to it |
| FORM-11 pincode-first address | 🔴 | Structured India address exists on the model; no pincode auto-fill |
| FORM-12 single 60-char name | 🔴 | Backend uses `first_name`/`last_name` — a **forced split**, which the rule bans |
| FORM-18 ₹ Indian grouping | ⚠️ | Paise-at-rest convention holds; shared formatter not verified everywhere |
| **FORM-19 zod failure-path test** | 🟠 | 7 files use zod; `REQ132`/`REQ141` covered 3 | 4 remain: `ClinicProfileForm`, `ClinicianFormDrawer`, `tasks/index`, `EditClinicianPage` |

FORM-12 is a genuine rules-vs-schema conflict, not a frontend bug — resolving it
needs a product decision, logged rather than silently ignored.

### §11 Data

| Rule | Status | Evidence |
|---|:--:|---|
| DATA-1 server/client split | ✅ | Apollo cache; no server data in a global store |
| DATA-2 no `useEffect` fetching | ✅ | 1 borderline instance; no `fetch` in effects |
| DATA-4 one client | ✅ | `src/apollo/client.js`; documented PDF exception via `utils/documents.js` |
| DATA-5 timeouts | ✅ | 10 s `AbortController` in `httpLink` |
| **DATA-7 paginated lists** | 🟠 | `{data, paginatorInfo}` convention real; migrated incrementally (`REQ133` testResults, `REQ134` notifications) | Unbounded queries remain |
| **DATA-9 cache invalidation** | ⚠️ | **The single most common wiring defect in this repo's history** — a missing `refetchQueries` shipped repeatedly | No mechanism |
| DATA-10/11 sensitive data + logout | 🔴 | Logout clears storage; full cache-clear unverified |
| DATA-12 polling cap | ⚠️ | No poll faster than 10 s found |
| **DATA-13 no mock fallback** | ✅ | Genuinely closed — `check-page-data-wiring.mjs` gate + `error`-only fallback. **One exemption pending-stale: `tasks/index.jsx`** (see below) |

### §12–§13 States & accessibility

| Rule | Status | Evidence |
|---|:--:|---|
| STATE-1 five states | 🟠 | Recent slices comply; older pages don't |
| STATE-8 error boundaries | ✅ | `ErrorBoundary` wraps routes. **Known trap:** a missing import white-screens with no visible text — catch with `page.on('pageerror')` |
| **A11Y-1 axe zero violations** | 🔴 | `axe-core` not run at all | CI-7 |
| **A11Y-5 icon-button labels** | 🟠 | Three real gaps found and fixed; each had a `Tooltip` and no label. **A Tooltip is not an accessible name** |
| A11Y-12 MUI Select targeting | ⚠️ | Documented: accessible name concatenates label + value once set, so `getByLabel(exact)` stops matching — use `data-testid` |
| A11Y-2/3/4/7/8/9/10 | 🔴 | Unmeasured |

### §14 Localisation — **entire family 🔴**

No i18n dependency. Every I18N rule is a gap. `FRONTEND_RULES` §20.1 names this
the single largest latent frontend cost, and it grows with every commit.
Closed by `phase-plans` P1-07 (framework + gate) and P2-08/P2-09 (languages).

### §15 Security

| Rule | Status | Evidence |
|---|:--:|---|
| SEC-1 HTTPS | ⚠️ | Deployment concern |
| **SEC-2 no token in localStorage** | 🔴 | **`AuthContext.jsx` reads `localStorage.getItem('medibook_token')`.** Open security gap — highest priority in §22 | P1-02 |
| SEC-5 no PHI in URLs/analytics | ⚠️ | No analytics shipped yet, so vacuously true. **Becomes live the moment analytics lands** |
| SEC-8/9 granular consent + withdrawal | ◐ | DPDP consent + rights requests shipped (`REQ034`); granularity/withdrawal-parity unverified |
| SEC-10 view/correct/export/delete | ◐ | Rights-request queue exists (review-then-act, not instant self-service) |
| **SEC-18 FE gate ≠ security; must match BE** | 🟠 | **Three real mismatches shipped** — routes gated narrower than their own resolvers, locking out legitimate users | Checklist item; no automation |

### §17–§18 Architecture & CI

| Rule | Status | Evidence |
|---|:--:|---|
| ARCH-1 feature folders | ⚪ | Organised by type across 170 files. **Deviation documented**; new features use `src/features/` |
| ARCH-4 per-surface bundles | 🔴 | One shared tree. Blocks PERF-1/PERF-3 |
| **ARCH-7 runtime validation** | 🔴 | zod used for **forms** in 7 files; **no API-response validation anywhere.** In a JS codebase this *is* the type system | Highest-priority with BASE-10 |
| ARCH-11 no `console.log` | ⚠️ | Not linted |
| **ARCH-15 match existing contract** | 🟠 | **Two dialects + three response conventions, all deliberate.** Skipping the check has caused shipped bugs incl. a mutation with the wrong argument shape that was never once functional | Checklist; no automation |
| CI-1 build | ✅ | `npm run build` gates |
| CI-2 eslint + ratchet | ✅ | **The model mechanism** |
| CI-3,5,6,7,8,10,11,12 | 🔴 | Not wired | P1-03 |
| CI-4 coverage thresholds | 🟠 | Tests run; coverage ungated |
| CI-9 e2e in CI | 🔴 | 45 specs, deliberately ungated — shared dev DB, leaves residue |
| CI-19 page-data-wiring | ✅ | Gate real and passing |

---

## 3. The pending-stale exemption

`scripts/check-page-data-wiring.mjs`'s `ALLOWED` set exempts `tasks/index.jsx`
because *"no backend domain exists yet"*. A `tasks` backend module now exists in
the working tree (uncommitted, parallel work). **When that lands the exemption
becomes false**, and the gate will silently pass a page it should flag.

This is exactly what `CI-19` exists for: a gate's exemption list is only as
current as the last time someone re-read the file it exempts. Re-verify when
`tasks` merges. The script already self-checks for the *opposite* direction (an
`ALLOWED` entry that no longer looks fabricated) — that self-check is what caught
the last stale entry.

---

## 4. Priority order to close

Ranked by (risk × leverage) ÷ effort. Slice IDs refer to `phase-plans/`.

| # | Item | Rules | Slice |
|---|---|---|---|
| 1 | **Pay the BASE-3 bargain** — zod at the API boundary + prop contracts | ARCH-7, BASE-10 | *needs a slice — not yet in Phase 1* |
| 2 | Auth token out of web storage | SEC-2 | P1-02 |
| 3 | Wire the missing CI gates | CI-3,5,7,11,12 | P1-03 |
| 4 | Slot hold + idempotency | BOOK-2, BOOK-3 | P1-05 |
| 5 | i18n framework + lint gate | I18N-1…10 | P1-07 |
| 6 | Paid-but-unconfirmed recovery state | BOOK-20 | *fold into P1-05* |
| 7 | Live patient-facing wait ETA | BOOK-12 | *Phase 2 candidate* |
| 8 | Surface bundle separation | ARCH-4, PERF-1/3 | *Phase 2 candidate* |
| 9 | Colour + file-size sweeps | UI-2, UI-14 | P2-20, P2-21 |
| 10 | Offline behaviour | DATA-8, WV-16 | P2-19 |

**Item 1 is the notable omission.** Phase 1 as currently written does not contain
a slice for ARCH-7/BASE-10, yet they are the compensating controls that make the
no-TypeScript decision safe. **Recommend adding it as P1-19** — or, better,
folding the API-boundary validation into P1-03 so the gate and the mechanism land
together.

---

## 5. Re-measure

```bash
cd frontend
npm run lint 2>&1 | tail -3                                              # UI-2 ratchet
find src -name "*.jsx" ! -name "*.test.jsx" -exec wc -l {} + | awk '$1>250' | wc -l   # UI-14
grep -rn "localStorage.*token" src | head                                # SEC-2
grep -rc "from 'zod'" src --include="*.jsx" | grep -v ':0' | wc -l       # ARCH-7 / FORM-19
grep -c i18next package.json || echo "I18N: none"                        # §14
ls src/platform 2>/dev/null || echo "WV-*: conditional"                  # §6
npm run build && ls -S dist/assets/*.js | head -3                        # PERF-1..4
```
