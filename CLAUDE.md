# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Role

Act as a senior full-stack engineer with 20 years of production experience shipping multi-tenant SaaS in regulated/consumer-trust domains (healthcare, fintech). Write production-grade code, not prototypes. Take the extra time to make it correct rather than "make it work." Assume everything you build is read and maintained by someone else in two years.

## Project

MediBook / HealthSync — multi-tenant SaaS for online doctor/clinic appointment booking, built for the **Indian market**. Read `context/README.md` first — it indexes every planning/decision doc under `context/` and states current build status; treat it as more current than this file for "what's built" questions.

## Project context

At the start of a session, run `node scripts/archive-sweep.mjs` (add `--apply` when it reports pending moves). It is a no-op when nothing has aged out.

Read these indexes before planning or implementing anything, then open the specific feature README and documents you need:
@requirements/README.md
@implementation-plans/README.md
@test-plans/README.md
@test-results/README.md
@test-suggestions/README.md
@context/README.md

Read-order rule: ACTIVE documents are authoritative. Consult `context/archive/README.md` and `test-results/_archive/` ONLY when the active tree does not answer the question (e.g. tracing why a decision was made, or auditing a historical test run). Never treat an archived document as current.

### Product direction: the CareOS PRD and its technical plans

`PRD-Healthcare-Booking-SaaS-India.md` (repo root) is the product spec for
"CareOS" — a materially larger product than what's built today: 17 functional
modules, ~200 `FR-*` requirements, three release phases. It was analysed
end-to-end on 2026-08-22 and turned into two layers of planning:

@project-plans/README.md
@project-plans/technical-plans/README.md

- **`requirements/REQ014`–`REQ035`** — 22 requirement documents (19 new feature slugs plus extensions to `security`/`patient-payments`/`notifications`) covering *what* each PRD module needs, with user stories, Given/When/Then acceptance criteria, and `FR-*` traceability.
- **`project-plans/technical-plans/`** — *how* to build them: phase-wise schema DDL, migration order, module layout, constraint decisions, and per-phase DoD. Seven documents: `00-foundation-hardening` (Phase F), `01-phase1-mvp`, `02-phase2-v1-ga`, `03-phase3-v2`, `04-data-model-evolution`, `05-cross-cutting-conventions`, and `06-frontend-architecture-and-mobile` (read this before touching anything under `frontend/src` — it carries the responsive **tiering** model, the design-system/typography rules, PWA budgets, and the frontend hard rules `FE-1`–`FE-6`).
- **`project-plans/01`–`07`** — the codebase audit those plans are grounded in: 33 findings with live-reproduced evidence (`02-findings-register.md`), the security/tenancy audit, test strategy, competitive analysis, and the consolidated roadmap.

**These do not replace `implementation-plans/`.** The working loop below still
requires plan mode and reading the real code before writing a `PLAN###` for a
specific slice — the technical plans give that step a starting architecture so
each slice doesn't re-derive it.

**Phase F (`technical-plans/00-foundation-hardening.md`) blocks the rest.** The
PRD adds ~40 new tenant-scoped tables; every one inherits the `client_org_id`
scoping bug class (F-01/F-04/F-05) and the zero-index defect (F-13) unless the
shared `orgScope()` helper, the index migration, and the tenancy-matrix
integration test land first. Building Phase 1 on the current foundation means
fixing those defects ~40 times instead of once.

**Phase F status (2026-08-22) — COMPLETE.** All six items closed:

| | What landed | Use it like this |
|---|---|---|
| F-11 `BUG002` | Real JWT secret, no `change-me` fallbacks in `docker-compose.yml` | secrets come from the environment; a missing one must fail boot, not default |
| F-02 `BUG003` | Frontend mock-auth bypass deleted (`MOCK_USERS`, `login-legacy.jsx`, the `mock_` token branch) | never reintroduce a client-side auth fallback; a failed `me` query logs out |
| F-01 `BUG004` | `backend/src/common/scoping/tenant-scope.ts` — `orgScope`, `orgScopeVia`, `isPlatformOperator`, `assertSameOrg` | **use these in every new tenant-scoped query.** Never write `user.client_org_id ? {...} : undefined` — that ternary is the bug: it makes "no org" mean "see everything". The helper fails closed on a `__no_org__` sentinel |
| F-13 `BUG005` | 69 indexes across 30 models (`20260822130000_add_indexes`) | index from the real `where`/`orderBy`, equality columns first and the range/sort column last. **Do not lead a composite with `client_org_id`** — measured, it matches ~20% of rows and the planner correctly ignores it; lead with the selective column (`clinician_id`, `clinic_id`, `patient_id`). Note `appointment_time`, not `appointment_date`, is the hot column |
| F-25 `BUG007`, `BUG012` | Integration harness + tenancy matrix (`backend/test/integration/`, `npm run test:int`) | **use it.** Real `AppModule`, real PostgreSQL (`postgres_test`, port 5433), real JWTs through the real guard chain. Adding a domain is one row in `setup/domain-cases.ts` — and `matrix-coverage.int-spec.ts` FAILS if you add a resolver domain without classifying it. `KNOWN_GAPS` is `[]` as of 2026-08-23 (`BUG012`) — all 21 tenant-scoped domains now covered or exempt with a stated reason |
| F-01 residue `BUG006` | 12 more services migrated onto the scoping helpers; new `orgIdForWrite()` | the defect has **four** spellings, not one — see below |
| F-26 `BUG008` | `.github/workflows/ci.yml` — 5 jobs; `scripts/check-page-data-wiring.mjs` | every CI command is one you can run locally. **Run `npm test` + `npm run test:int` + `npm run lint` before committing** — CI runs exactly those |
| F-22/F-29 `BUG008` | frontend lint works at all; backend suite safe to run unattended | `npm test` is `jest --runInBand` — **do not "optimise" it to parallel workers**, measured: default OOM-kills (exit 137), 2 workers 182s + a bogus leak warning, 1 process 118s |

**The scoping bug has four spellings. Grepping for one finds a third of them.**
`BUG004` fixed the `client_org_id ? {...} : {}` ternary and left twelve
instances behind, two of them live-exploitable. All four of these mean *no
filter* for an org-less caller:

| Spelling | Why it leaks |
|---|---|
| `user.client_org_id ? { client_org_id: … } : {}` | spreads to nothing |
| `client_org_id: user.client_org_id ?? undefined` | Prisma reads `undefined` as "key not supplied" |
| `clinic: user.client_org_id ? { … } : undefined` | same, on a relation filter |
| `if (user.client_org_id && …) { throw }` | the guard is skipped, not failed |

**On a `create`, use `orgIdForWrite(user, 'thing')`, never `?? undefined`** —
that doesn't leak on read, it silently writes an **org-less row**. Six create
paths did this; `createRole` produced platform-global roles from an org admin's
own "create custom role" button.

**Do not write a unit test that asserts `client_org_id: undefined`.** Three specs
did, pinning the bug in place — they would have failed against correct code. Assert
the key is **absent** for a platform operator and **`'__no_org__'`** for everyone
else with no org. Better still, add a matrix row: a mocked-Prisma test asserts the
`where` a service *built* and can never fail an isolation check, which is exactly
how F-01 and all twelve of BUG006 shipped green.

**Never lower `BCRYPT_COST`.** It lives in `common/crypto/bcrypt-cost.ts`, is
overridable only so the test suite can stop timing out, and refuses to start
below 12 when `NODE_ENV=production`.

**Redis and Prisma both close on shutdown now** (`redis.module.ts`
`onApplicationShutdown`, `main.ts` `enableShutdownHooks()`). Any new long-lived
client you add needs the same, or `app.close()` will hang again.

**Phase G (PRD MVP core) — five of six requirements shipped, one to go.**
`project-plans/07-prd-gap-analysis-and-roadmap.md` §3's Phase G sequence is
`REQ017 → REQ020 → REQ021 → REQ019 → REQ018 → REQ032` (dependency order,
`REQ017` first since it's the critical path both `REQ018`/`REQ019` need).
`REQ017`, `REQ020`, `REQ021`, `REQ019`, and `REQ018`'s own P0 subset all
shipped 2026-08-24; only `REQ032` (subscription plan engine) remains,
deliberately paused before starting rather than rushed — see its own note
below for why.

`REQ017`'s P0 scope (session/token scheduling mode, multi-resource booking,
mode-aware slot-integrity constraint) shipped 2026-08-24 — see
`requirements/scheduling-engine/`, `PLAN055`/`TP082`/`TR081`,
`context/scheduling-engine-2026-08-24-req017/manifest.md`. `REQ017`'s own P1
scope (hybrid-mode interleaving, waitlist, delay broadcast, bulk-reschedule,
the live-throughput ETA refinement) is explicitly deferred, not silently
dropped — each needs its own future `PLAN###`. Note the booked:walk-in
interleaving half of this deferral directly blocked part of `REQ018`'s own
P0 scope below (`US-BOOK-01`'s token-interleaving acceptance criterion) —
it stayed blocked there too, not silently re-attempted.

`REQ020`'s P0 scope (structured consultation notes, one-click templates,
persistent allergy banner, attachments, sign-off immutability enforced by a
real Postgres trigger — this codebase's first two — and a cross-domain
patient timeline) also shipped 2026-08-24 — see
`requirements/clinical-records/`, `PLAN056`/`TP083`/`TR082`,
`context/clinical-records-2026-08-24-req020/manifest.md`. Two real bugs were
found and fixed in the process (see `PLAN056` for the full account): a
missing `class-validator` decorator silently rejected every note save (a
real clinical-safety data-loss defect — the frontend gave no error feedback
either, since fixed), and `getOrCreateEncounter`'s find-then-create had a
genuine concurrency race, reachable from a real double-click or two browser
tabs, not just React StrictMode's dev-only double-invocation that first
surfaced it. Classifying `encounters` in the tenancy matrix also found that
**`test:int` was already red before this slice touched anything** — `REQ017`'s
own `resources` domain, plus `drugs` (`REQ016`/`REQ044`) and
`organization-onboarding` (`REQ013`), had shipped without ever being added to
`matrix-coverage.int-spec.ts`; all three closed alongside `encounters` in the
same pass (two real `CASES` entries, one honest `EXEMPT`). `REQ020`'s own P1/P2
scope (ICD-10 coding, discrete vitals for growth charts, investigation
orders, referrals, voice-to-text, clinical decision support, speciality
packs) is explicitly deferred, not silently dropped.

`REQ021`'s P0 scope (drug search with auto-calculated quantity, saved
favourite drug-sets, a print view sharing one rendering path between
preview and `window.print()`, repeat-from-history with a server-side
reprint counter driving a "DUPLICATE" watermark) shipped 2026-08-24 — see
`requirements/prescriptions/`, `PLAN057`/`TP084`/`TR083`,
`context/prescriptions-2026-08-24-req021/manifest.md`. New
`backend/src/prescriptions/`. Real bugs found: a missing `refetchQueries`
after saving a favourite set (found via live manual verification); two
missing `TableContainer` wraps (Hard Rule 5); and — in the e2e spec itself,
not the app — an unlabeled MUI `Select` colliding with a sibling
Autocomplete's own `role="combobox"` (fixed with `inputProps={{
'aria-label': ... }}`, the correct way to label a `Select` with no visible
`InputLabel` — a bare `aria-label` prop lands on the wrong DOM node) and a
fixed-name fixture colliding with itself across repeated runs against the
real, accumulating dev DB. `REQ021`'s own P1 scope (WhatsApp/OTP-gated
sharing, Telemedicine Practice Guidelines drug-list enforcement, regional-
language rendering, digital signatures, the pharmacy dispense-queue
handoff) is explicitly deferred.

`REQ019`'s P0 scope (the live queue board — now-serving, next-5 waiting, a
same-day retrospective average wait; queue actions — call next, recall,
skip/park with N-served auto-return, transfer; an unbilled-visits report),
built on top of `REQ042`'s prior check-in slice, shipped 2026-08-24 — see
`requirements/queue-management/`, `PLAN058`/`TP085`/`TR084`,
`context/queue-management-2026-08-24-req019/manifest.md`. New
`backend/src/queue/`. The key architectural move: `QueueService`'s state
sync runs *inside* `AppointmentsService.transitionStatus()`'s own
transaction, so `REQ042`'s existing check-in/complete/no-show mutations now
also drive real queue state with zero change to the pages that already
call them. `REQ019`'s own P1 scope (QR self-check-in, a predictive
rolling-median ETA, mandatory pre-consultation checklists, triage/vitals)
is explicitly deferred; the booked:walk-in interleaving half of `US-BOOK-01`
stays blocked on `REQ017`'s own deferred `walkin_ratio` logic, not
re-attempted here either.

`REQ018`'s P0 **subset** (patient dedup-suggestion + a real, tightly-gated
merge tool; family/dependant profiles — one phone-verified login managing
multiple patient records) shipped 2026-08-24 — see
`requirements/appointments/`, `PLAN059`/`TP086`/`TR085`,
`context/appointments-2026-08-24-req018/manifest.md`. Per-service
prepayment policy (`US-BOOK-03`) and the embeddable booking widget
(`US-BOOK-05`) — both also P0 in `REQ018`'s own phase assignment — were
deliberately scoped out of this pass to keep it coherent and fully tested,
not silently dropped; each needs its own future `PLAN###`. A real,
pre-existing security gap was found and closed in the process:
`createAppointment` never validated a `'patient'`-role caller's
`input.patient_id` against their own identity at all — Hard Rule 6's bug
class, surfaced because family profiles needed the *opposite* of a blanket
restriction (a caller legitimately booking for a genuine dependant, never
an arbitrary id) and so required actually looking at what was there
before. Also made a previously fully-built, entirely mock-gated
patient-merge UI (`patients/index.jsx`) reachable against real data for the
first time — it existed complete (pairwise selection, review dialog) but
its own "Merge Duplicates" button was gated on `{useMock && ...}`, which
never renders once real patient data exists.

**`REQ032` (subscription plan engine) is deliberately paused before
starting**, not merely next in a checklist. It is a different risk
category from the four slices above: those were additive, isolated new
modules (`prescriptions/`, `queue/`, extensions to `patients/`); `REQ032`
requires a global `EntitlementGuard` consulted on *every* feature-gated
resolver call across the entire app (structurally analogous to the
existing `RolesGuard` already in the shared `APP_GUARD` chain — see
Architecture), plus Redis-backed per-tenant caching to avoid becoming an
N+1-shaped latency cost on every gated call (`project-plans` F-15's own
warning, cited directly in `REQ032`'s non-functional notes). Getting the
guard-chain integration or the cache-invalidation-on-plan-change wrong
doesn't fail one feature — it can silently over- or under-gate every
feature-flagged module in the product at once. Scope it with the same
plan-mode rigor as the four slices above before writing any guard code;
don't start with the entitlement guard itself — start with the plan-builder
data model and versioning (`US-PLAN-01`/`02`), which are additive and
lower-risk, and treat the guard's integration into the shared chain as its
own reviewed step.

**Phase G+1 — five more PRD-derived slices shipped 2026-08-24, chosen and
scoped by cross-checking `project-plans/07-prd-gap-analysis-and-roadmap.md`'s
remaining candidates against the real code first.** Sequence:
`REQ014 → REQ029 → REQ025 → REQ016 → REQ023`. All five follow the same
pattern as Phase G's own four slices — additive, isolated, no new external
integration — and all five had at least one real assumption from the
requirement doc corrected by reading the actual code before scoping, not
taken at face value:

| Requirement | What shipped | Scope correction found before starting |
|---|---|---|
| `REQ014` | `Departments` entity (`US-ORG-03`) — specialty grouping for clinicians/services, admin CRUD page | `US-ORG-04` (generic `Resource` entity) turned out already fully built by `REQ017`; `US-ORG-01`/`02` (onboarding) already shipped by `REQ045` |
| `REQ029` | Real slot-capacity utilisation (`US-RPT-01`), replacing the documented completion-rate proxy; new `getAppointmentStats` tenancy-matrix coverage (`US-RPT-04`) | None — this one's scope matched the requirement doc as written |
| `REQ025` | WhatsApp channel-priority dispatch with SMS fallback (rest of `US-NOT-01`), quiet hours + daily frequency cap (`US-NOT-04`) | `REQ048` (2026-08-23) had already registered the WhatsApp provider itself — this slice is exactly the dispatch-ordering logic that slice's own "what this does not do" section deferred |
| `REQ016` | Differentiated pricing by patient category and channel (`US-CAT-04`), one shared `resolveServicePrice()` helper used by every price-reading call site | `REQ016`'s drug-master/tax-depth stories were already closed by `REQ044`/`REQ046`; only `US-CAT-04` was genuinely open |
| `REQ023` | Mixed-tender counter billing (scoped subset of `US-BIL-01`) — front-desk cash/UPI/card/cheque split closing an appointment's bill | `US-BIL-09` (GST fields) already shipped by `REQ047`; `US-BIL-08` (the `createRazorpayOrder` auth finding, F-07) was already reviewed and deliberately left `@Public()` by `REQ040` — re-"fixing" it would have regressed `BUG011` |

See `PLAN060`–`PLAN064`/`TP087`–`TP091`/`TR086`–`TR090` and each
`context/<feature>-2026-08-24-reqXXX/manifest.md` bundle for full detail,
including four real bugs found and fixed during live verification (not
just unit tests) across this pass:

1. **`departments.service.ts`'s `create()`** derived `client_org_id` from
   the caller (`orgIdForWrite`) rather than the already-validated target
   clinic — crashed with a raw Prisma error for an org-less platform
   operator, and could have silently mismatched a Department's org from
   its own clinic's org for a platform operator with their own org set.
   Fixed by deriving from the clinic instead. The identical latent bug
   exists in `resources.service.ts` too — flagged, not fixed (out of scope
   for that slice).
2. **A math error** in a new `isWithinQuietHours` unit test, caught before
   the suite ever ran by re-deriving the UTC→IST conversion by hand.
3. **`settings/index.jsx`'s quiet-hours "Clear" button was a silent
   no-op** — it sent `quiet_hours_start: quietHoursStart || undefined`,
   but this codebase's partial-update convention treats an omitted field
   as "leave the stored value alone," not "clear it." Only surfaced by
   live-testing the revert of test data, not by any unit test. Fixed by
   sending explicit `null` when cleared.
4. **A tenancy-matrix fixture bug**: two new dedicated *completed*
   appointment rows added for `REQ029`'s own domain-case coverage reused
   the same clinician + time slot as the pre-existing `appointmentA`/`B`
   fixture rows, tripping the real Postgres no-overlap EXCLUDE constraint
   and failing `test:int`'s global setup outright. Fixed with a distinct
   time slot.

Also worth internalizing for future work: **this pass's live verification
directly confirmed the cross-call-site price-consistency design `REQ016`
exists to guarantee** — setting a `'walkin'` channel override on a real
service and then calling `recordCounterPayment` (`REQ023`) resolved the
exact same overridden rate, not the base price, end-to-end through both
slices together. This is the strongest evidence available (short of a real
Razorpay checkout, not exercised this session) that the shared
`resolveServicePrice()` helper actually closes the display-vs-charge risk
it was built for.

**Phase G+2 — eight more PRD-derived slices shipped 2026-08-24, spanning
eight different feature areas in one continuous pass.** Sequence:
`REQ018 → REQ032 → REQ034 → REQ022 → REQ030 → REQ031 → REQ015 → REQ029`.
Selection criterion, same as Phase G+1: additive, isolated, no new
external vendor integration. Unlike the prior two passes, this one was
executed with all 8 slices' *code* written first and the full
verification suite run *once* at the end, per an explicit instruction —
proven not to sacrifice rigor: the consolidated run still caught 8 real
bugs (listed below), same order of magnitude as the per-slice-verified
passes before it.

| Requirement | What shipped | Deliberately NOT built |
|---|---|---|
| `REQ018` (residue) | Per-service prepayment policy (`US-BOOK-03` — a `'required'` service leaves its booking `awaiting_payment` until a real payment succeeds) + the embeddable booking widget's allowlist/slug config (`US-BOOK-05`'s config half — `booking/index.jsx` itself needed zero changes) | An "Embed Code" admin UI |
| `REQ032` | Plan-builder data model and versioning (`US-PLAN-01`/`02`) — `Plans`/`PlanVersions`, editing a live plan closes the old version and opens a new one | The entitlement guard (`US-PLAN-03`) — still deliberately paused, per this file's own standing caution |
| `REQ034` | DPDP consent capture (`Consents`, purpose-specific, append-only) + data-subject rights requests (`RightsRequests`, request-queued-for-admin-review, never instant self-service deletion) | Automated erasure/correction execution; `DisclosureLog`/`RetentionPolicies` |
| `REQ022` | Per-clinic drug batch/stock ledger (`DrugBatches`/`StockMovements`, append-only) — receive → dispense (linked to a real `PrescriptionItems` row) → adjust | Purchase orders, FEFO suggestions, GST purchase invoicing (all correctly P1) |
| `REQ030` | Signed outbound webhook delivery (`WebhookEndpoints`/`WebhookDeliveryLog`, HMAC-SHA256), fired from real events (`appointment.created`/`.confirmed`/`.cancelled`, `payment.succeeded`) | Retry with exponential backoff — best-effort/synchronous only, this story's own P1 criterion |
| `REQ031` | Payer/TPA master (`Payers`, global like Languages) + per-branch empanelment + manual patient policy capture | Payer-specific tariffs, OCR pre-fill, eligibility badges, the benefit-wallet adjudication engine |
| `REQ015` | Clinician verification fields (admin-attested interim path) + org-scoped `ApiKeys` (bcrypt-hashed, shown once) | SSO/SAML/OIDC (`US-SEC-09`) — needs a real external IdP integration |
| `REQ029` (2nd slice) | Patient report group (new-vs-repeat, acquisition source, lapsed-patient recall) + scheduled report delivery (hourly `@Cron`, per-schedule cadence tracking) | WhatsApp delivery channel (email-only this slice); real email sending is stubbed — no AWS SES integration exists anywhere in this codebase yet, matching the existing OTP-SMS stub convention |

See `PLAN065`–`PLAN072`/`TP092`–`TP099`/`TR091`–`TR098` and each
`context/<feature>-2026-08-24-*/manifest.md` bundle for full detail. Eight
real bugs found and fixed during this pass, all at the unit-test-writing
stage (not live browser testing, which this pass's environment issue —
below — prevented):

1. **A call-count regression in `appointments.service.ts`**: the first
   draft of `REQ030`'s webhook-firing code did an unconditional
   `clinics.findUnique` fetch on every booking to resolve the org id,
   breaking a pre-existing "org-less caller" test and adding a real,
   avoidable query to the hot booking path. Fixed by reusing the caller's
   own JWT `client_org_id` (already established by the method's own
   org-boundary check) instead of re-fetching it.
2. **`BookingWidgetService.create()`/`update()`** let `assertClinicInScope`
   throw unhandled instead of returning the graceful `{success, userErrors}`
   shape `BookingWidgetMutationResultType` promises — the same
   throws-vs-wraps inconsistency class as other domains, caught here by
   its own unit test rather than shipped.
3. **The most significant finding, not scoped to one domain**:
   `common/scoping/tenant-scope.ts`'s `isPlatformOperator()` treats every
   `admin`/`super_admin` caller as platform-wide *unconditionally*,
   regardless of their own `client_org_id` — a documented, intentional
   design (CLAUDE.md's own words: "only admin/super_admin are
   platform-wide by design"). Two new domains (`webhooks`, `api-keys`)
   were initially gated `@Auth('admin', 'super_admin')` only, which made
   their own `isSameOrg()` cross-tenant rejection checks **unreachable
   dead code** — the only callers who could ever reach them were always
   treated as allowed to see every org, so the "rejects a cross-org X"
   unit tests passed vacuously (never exercising the rejection branch at
   all) until this was noticed. Fixed by widening both resolvers'
   `@Auth()` to include `'manager'` (this schema's real org-scoped top
   role, the same gate `departments`/`services`/`insurance` already use)
   and switching the corresponding unit tests to a `'manager'`-role actor,
   with an inline comment recording why `'admin'` would be the wrong
   choice for testing tenant isolation on *any* future domain, not just
   these two. **Read this before writing a new admin-gated domain**: if a
   mutation is gated to `admin`/`super_admin` only, its own `isSameOrg()`
   check (if it has one) can never actually reject anyone — either widen
   the gate to include a real org-scoped role, or don't write the check.
4. **A missing `clinic_id` column**, caught by `tsc --noEmit` before any
   test ran: `ScheduledReports`'s first schema draft omitted it even
   though the DTO/entity/service all reference it. Fixed with a small
   follow-up migration on top of the same-session combined migration.
5. **Two test-authoring bugs**, both caught by re-deriving the correct
   assertion before trusting the first draft: a hardcoded, disconnected
   `key_prefix` literal in an API-key test (fixed to echo the service's
   real generated prefix), and a `payers.findMany` assertion missing the
   service's own `orderBy` clause.

**An environment blocker hit mid-pass, resolved the same session**:
`medibook_backend` became unresponsive to `docker restart`/`stop`/`kill`
partway through this pass's verification window — Docker itself stayed
responsive to `docker ps`, but every lifecycle command targeting this one
container hung indefinitely (tens of minutes, never resolving). Resolved
by quitting and relaunching Docker Desktop entirely (`osascript -e 'quit
app "Docker"'`, then `open -a Docker`) — this also cleanly cycled
`medibook_postgres`/`medibook_redis` (both recovered to healthy in under
30s, no data loss), and left `medibook_backend` itself exited rather than
auto-restarted, needing one explicit `docker start medibook_backend`
(first compile ~4 minutes under host load — a full, not incremental,
compile with 8 new modules). **If `docker restart`/`stop`/`kill` ever hang
on one specific container again with `docker ps` itself still responsive,
don't keep retrying targeted commands — quit and relaunch Docker Desktop
itself.**

With the container back, this pass's remaining live-verification gap was
closed the same session, as `admin@medibook.dev`/`manager@medibook.dev`
against real dev-seeded data (Sarah Mitchell, Anita Sharma, the "GP
Consultation" service, "MG Road Clinic") — confirming, among other things,
the full `REQ018`→`REQ030`→`REQ023` chain end-to-end together: booking a
`prepayment_policy: 'required'` service left it `awaiting_payment`, fired
a real `appointment.created` webhook (logged as `failed` against a
deliberately unreachable test endpoint, not swallowed or thrown), and a
real `recordCounterPayment` call transitioned it to `confirmed`. Every
test artifact mutated on a *shared* fixture (the GP Consultation service's
`prepayment_policy`, Sarah Mitchell's `verification_status`) was reverted
afterward; new rows created for the test (webhook endpoint, API key,
consent, rights request, scheduled report, drug batch) were left in place,
matching this codebase's existing "E2E Service *"-style precedent for live
test residue.

**This live pass found a ninth real bug, then three more of the identical
class by proactively auditing every new DTO** — the exact bug class
`REQ020` first found (a `class-validator`-decorator-free `@Field` silently
stripped by the global `ValidationPipe`'s `whitelist:true`, then rejected
by `forbidNonWhitelisted:true`), reachable only through a real HTTP
request against the real `ValidationPipe`, never by a mocked-Prisma unit
test. First hit live on `pharmacy`'s `AdjustStockInput.quantity_delta`
(`adjustStock` failed with `"property quantity_delta should not exist"`);
grepping the other 7 new domains' DTOs for the same "a `@Field` with zero
validator decorators" shape found two more real instances before they
could bite live: `Plans.price` (both input types) and `ScheduledReportInput
.clinic_id`. All three fixed (an appropriate decorator added — `@IsInt()`
for a deliberately-signed field, `@IsNumber() @Min(0)` for money,
`@IsOptional()` for a genuinely-optional field), full suite re-confirmed
green, and the two live-reachable ones (`adjustStock`, `createScheduledReport`)
re-tested live to confirm the fix. **When adding any new `@InputType()`
field, give it at least one `class-validator` decorator even if
"obviously" always valid — an undecorated field isn't just unvalidated,
it's silently deleted by this app's global pipe.**

**Phase G+2 frontend completion — the "no frontend UI in this slice"
deferral on all 8 domains above is now closed (2026-08-24).** Real, tiered,
theme-token-compliant UI for `REQ018` residue, `REQ032`, `REQ034`,
`REQ022`, `REQ030`, `REQ031`, `REQ015`, `REQ029` 2nd slice — see
`PLAN073`/`TP100`/`TR099`,
`context/platform-nfr-2026-08-24-phase-g2-frontend-completion/manifest.md`.
New: `pages/admin/{Plans,Payers,RightsRequests}.jsx`, `pages/manager/
{pharmacy,reports}/index.jsx`, and two new tabs (Integrations, Privacy) on
`pages/settings/index.jsx`. Verified with a new Playwright spec
(`frontend/e2e/phase-g2-frontend-completion.spec.js`, 7/7 passing) against
the real backend, plus the full Hard Rule 3 suite (frontend lint/unit/
build, backend unit/integration/lint/typecheck, page-data-wiring gate —
all clean).

Three real bugs found, one of them foundational — read this before
building any new patient-facing feature:

1. `settings/index.jsx` was missing the `CircularProgress` import used by
   the new Privacy tab — crashed the *entire* Settings page (all 7 tabs)
   for every visitor, not just Privacy. Found via a direct
   `page.on('pageerror', ...)` capture, since the failure rendered a blank
   page with no visible error text at all.
2. `/admin/payers` and `/admin/rights-requests` were routed behind the
   `admin`/`super_admin`-only `RoleGuard`, while their backend resolvers
   are `@Auth('manager', 'admin', 'super_admin')` — real managers, the
   actual day-to-day callers, got the app's own 403 page before ever
   reaching the route. Exactly the frontend-route-vs-backend-contract
   mismatch Hard Rule 7 warns about. Fixed by moving both routes into the
   existing "admin OR manager" `RoleGuard` block, the same one
   `/admin/communications`/`/admin/policies` already use for the identical
   reason (a manager, not an org-less admin/super_admin, is the real
   caller for an org-scoped feature).
3. **A genuine, pre-existing, foundational `AuthContext.jsx` bug, not
   scoped to this slice's own new code**: `useAuth().user.patient.id` is
   permanently `undefined` for any freshly-logged-in patient session.
   `LOGIN_MUTATION`'s response (`graphql/mutations.js`) selects `user { id
   name email roles clinician {...} }` — no `patient` field at all — and
   `login()` caches that straight into `localStorage.medibook_user`.
   `AuthContext`'s own mount effect only calls the fuller `ME_QUERY`
   (which *does* select `patient { id full_name }`) when no cached user
   exists yet — and a fresh login always populates that cache first, so
   the fuller query never runs. Confirmed independent of any frontend code
   via a direct curl repro (link a patient in DB → fresh login → `me {
   patient { id } }` returns correctly) proving the backend is fine and
   the bug is purely in the frontend's login-time caching.
   `pages/patient/Family.jsx` never hits this because it doesn't read
   `user.patient.id` at all — its `MY_DEPENDANTS_QUERY` is self-scoped
   server-side from the caller's own JWT `patient_id` claim, the more
   robust pattern. **Worked around locally** in the new Privacy tab (a
   dedicated `GET_MY_PATIENT_LINK` network-only query resolves the link
   fresh on tab load instead of trusting the cache) — **not fixed at the
   `AuthContext` level**, deliberately: a core auth-caching change needs
   its own reviewed slice, not a rider on a frontend-completion pass. Any
   *other* existing or future code that reads `useAuth().user.patient.id`
   directly hits the identical bug and has not been audited for it here.

**A second, more severe environment blocker hit mid-pass — the host itself
rebooted, not just a container.** `uptime` dropped from ~11h to ~10min
mid-session, and the machine entered a startup-storm load spike (load
average measured at 116.53 at its peak — normal is single digits) from
every login-item app (Docker Desktop, Chrome, VS Code, Adobe Creative
Cloud, Time Doctor, Spotlight reindexing) launching at once. This wedged
Docker Desktop's daemon and individual containers into an "Up but
completely unresponsive" state repeatedly — `medibook_backend` again, and
for the **first time this session**, `medibook_frontend` too (Vite itself
hangs, unresponsive even via `docker exec ... wget localhost:3000` from
*inside* the same container — confirmed not a port-mapping issue). The
established `medibook_backend` recovery pattern (quit Docker Desktop
entirely via `osascript -e 'quit app "Docker"'`, relaunch via `open -a
Docker`, wait for the daemon, `docker rm -f` the specific wedged container,
`docker compose up -d` it fresh) worked identically for `medibook_frontend`
— this is now a general "any container can wedge, not just the backend"
pattern, not a `medibook_backend`-specific quirk. **If a load spike this
severe hits again: don't fight it with more restarts** — each one adds
load to an already-overloaded system. Poll `uptime`'s load average and
wait for it to fall before retrying; it settled from 116 back to ~15-25
within about 90 seconds once the post-boot storm passed.

**`npm run test:int` must run from the host, not `docker exec
medibook_backend`** — a previously-undocumented gotcha, found while
re-verifying this pass. Its `postgres_test` connection string is hardcoded
to `localhost:5433`, a host-side Docker port mapping; from *inside* the
`medibook_backend` container's own network namespace, `localhost` resolves
to the container itself, not the `medibook_postgres_test` service, so the
suite fails immediately with "Can't reach database server at
localhost:5433" — even though `postgres_test` is genuinely healthy and
running. Run it as `cd backend && npm run test:int` from the host instead
(after `docker compose --profile test up -d postgres_test`, as already
documented) — CLAUDE.md's own command list phrased backend commands as
interchangeable between host and `docker exec`, which is true for every
other backend command *except* this one.

**Phase G+3 — eight more P1-residue slices shipped 2026-08-25, closing
out the remaining P1 scope of eight already-mostly-shipped requirements
in one continuous pass.** Sequence: `REQ051 → REQ052 → REQ053 → REQ054 →
REQ055 → REQ056 → REQ057 → REQ058`. Selection criterion, same as every
prior G-series pass: additive, isolated, no new external vendor
integration — except this time **research came first and reshaped scope
twice** (see `REQ055`/`REQ057` below), a discipline worth repeating for
any future batch of this kind.

| Requirement | What shipped | Deliberately NOT built |
|---|---|---|
| `REQ051` (queue-management, `US-QUE-06`) | Mandatory pre-consultation checklist gating `callNext()` — a new `ChecklistItems`/`ChecklistCompletions` pair, keyed by `appointment_id` not `encounter_id` (confirmed via exploration that an encounter doesn't exist yet at call-next time) | — |
| `REQ052` (appointments, `US-BOOK-04`/`06`) | Auto-mark-no-show sweep (`@Cron`, configurable grace period + repeat-no-show prepayment forcing) and configurable per-clinic intake fields, exposed as structured `IntakeFieldResponseType[]` not a raw JSON scalar | — |
| `REQ053` (security, `US-SEC-05`/`06`) | Time-boxed break-glass access grants; JWT-embedded impersonation (`real_actor_id` claim, target's own identity minted into the token, 30-min TTL doubling as automatic reversion) with full audit attribution | SSO/SAML/OIDC (needs a real external IdP) |
| `REQ054` (catalog-master-data, `US-CAT-01`) | Multi-sitting service packages — purchase once, redeem sittings across future appointments via a sibling `redeemPackageSitting` mutation on `appointment-payments`, not a shoehorned zero-amount case through `recordCounterPayment` | Partial-sitting packages, package transfer/refund/renewal |
| `REQ055` (organizations, `US-ORG-05`) | Org→branch masters cascade for services — `ProductBranchOverrides` (inherit/override/skip), `resolveServicePrice()` gains a 4th optional argument. **Research reshaped scope**: a clinical service is already, today, an org-level master (`clinic_id: null`); the real gap was the missing branch-override layer, not an "org-level default" layer as originally assumed | Admin UI; the `appointments.service.ts` list-preview call site (N+1 risk, documented as a named follow-up) |
| `REQ056` (patient-payments, `US-BIL-03`/`04`) | Discount-approval workflow (queued above a configurable per-org threshold, decided by a distinct manager+ caller who can't be the original requester) reusing `REQ034`'s `RightsRequests` request/decide-later shape — no dual-approval mechanism existed anywhere in this codebase before; day-end cash close computing expected-vs-counted variance server-side per tender type | Denomination-level breakdown, formal shift handover, a generic `AuditLogs` write (the request row itself is the durable record) |
| `REQ057` (patient-portal, `US-PAT-02`) | Real server-side PDF generation (`pdfkit`, not puppeteer — this session's own observed host disk/memory pressure) for prescriptions/invoices/visit summaries, via a new REST-only `documents` module. **Zero new tenant-isolation logic** — composes three already-scoped assembly methods (two reused verbatim, one new) rather than re-deriving access control a third time | Pixel-perfect visual parity; dependant-aware self-scoping (deliberately not widened, per the standing residue note below); frontend download UI |
| `REQ058` (messaging, `US-MSG-01`/`03`) | Department/branch-scoped threads via **create-time auto-participant-add**, not a dynamic read-time visibility rule — `threads()`/`thread()` stay completely unchanged, zero regression risk; message attachments (reusing `attachments.controller.ts`'s exact upload pattern); org-scoped canned replies, deliberately gated away from `'patient'` | `US-MSG-04` (auto-responder), `US-MSG-05` (clinical-record linkage), non-clinician staff department membership |

One real bug found and fixed, non-domain-specific enough to matter for
any future work in this codebase: **`import X from 'some-cjs-package'`
can type-check cleanly and still throw `X.default is not a constructor`
at runtime.** This repo's `tsconfig.json` sets `allowSyntheticDefaultImports`
(a type-checking-only convenience) but not `esModuleInterop` (the flag
that actually generates the `.default` wrapper for a CommonJS package at
runtime) — hit adding `pdfkit` for `REQ057`, caught by the first real unit
test run, not `tsc --noEmit` (which has no runtime component to catch an
interop mismatch like this). Fixed with TypeScript's `import X =
require('some-cjs-package')` form, which always binds directly to
`module.exports` regardless of either interop flag. **Any future
default-imported CommonJS-only dependency in this codebase will hit the
identical failure** — reach for the `= require(...)` form from the start,
don't assume a clean `tsc --noEmit` proves the import works.

Two of the eight slices (`REQ054`, `REQ058`) held on the first
implementation pass with no real design bugs — in both cases because the
fix patterns learned earlier in the same batch (optional tenancy-matrix
arguments for a caller-supplied scoping id, `isPlatformOperator`/
`isSameOrg` cross-org semantics, Hard Rule 6 cross-domain FK validation)
were applied proactively from the start rather than discovered via a
failing test. This is the second time in this codebase's history a batch
has had a genuinely bug-free slice (the first was `REQ054` alone, in
Phase G+2's own account above) — worth treating as a real, repeatable
effect of front-loading a prior pass's own lessons, not survivorship
bias.

**Environment note, consistent with every prior G-series pass**:
`docker restart medibook_backend` after a schema change repeatedly took
3–6 minutes under host load this session (confirmed via `docker stats`
showing sustained 100%+ CPU throughout, not a wedge) — noticeably slower
than earlier sessions' restarts. If a restart appears stuck, check
`docker stats` before assuming a wedge; only quit-and-relaunch Docker
Desktop entirely if CPU usage is genuinely flat at 0%, per the
established recovery pattern from Phase G+2's own account.

**All 8 slices are backend-only**, per an explicit, confirmed direction
at the start of this batch (`AskUserQuestion`: "Backend-only, frontend
pass after all 8") — matching Phase G+2's own precedent exactly, where a
dedicated frontend-completion pass followed the backend batch as its own
separately-reviewed slice. That same follow-up is still owed here and has
not yet been scheduled. Full verification for the batch: backend unit
80/80 suites (1213/1213 tests, up from 73/1053 before this batch started),
integration 4/4 suites (369/369 tests, up from 315), `eslint`/
`tsc --noEmit` clean throughout. See `context/queue-management-2026-08-25-req051/manifest.md`
through `context/messaging-2026-08-25-req058/manifest.md` for each
slice's own full account, and `project-plans/07-prd-gap-analysis-and-roadmap.md`'s
own staleness note for how this batch changes the PRD-module gap picture.

**Phase G+3 frontend completion — the "no frontend UI in this slice"
deferral on all 8 domains above is now closed (2026-08-25).** Real,
backend-verified UI for `REQ051`–`REQ058`, matching Phase G+2's own
frontend-completion precedent exactly. New: `pages/manager/{clinic-forms,
packages}/index.jsx`, `utils/documents.js` (the shared authenticated-PDF
download helper — a bare `<a href>` can't carry a Bearer header). New e2e
spec `frontend/e2e/phase-g3-frontend-completion.spec.js`, one test per
domain (10 total — Cash Drawer Close split out of Discount Approval once
both needed independent fixtures), all passing against the real backend.
See `PLAN082`/`TP109`/`TR108` and
`context/platform-nfr-2026-08-25-phase-g3-frontend-completion/manifest.md`
for the full account, including eight real bugs found this pass — two of
them backend, previously shipped, invisible to any unit test:

1. `break-glass.service.ts`'s own notification dispatch used an event
   type never added to the `NotificationEventType` enum, failing the
   *entire* `requestBreakGlassAccess` mutation for any org with an
   admin/manager to notify. Fixed with a migration + a `DEFAULTS` entry.
2. A real impersonation race in `AuthContext.jsx`: its null-user `LOGIN`
   dispatch during `startImpersonating()` left `isLoading: false`, so
   `RootRoute`'s own `navigate('/')` raced ahead of the target's real role
   loading and flash-redirected to `/dashboard`, which `RoleGuard` then
   rejected the instant the real role arrived. Fixed with an explicit
   `SET_LOADING: true`.
3. The "Download Invoice" button (built in this same pass) was
   unreachable — `recordCounterPayment`'s success handler closed the Take
   Payment dialog at the exact moment the condition that reveals that
   button became true. Fixed by not closing the dialog on success.
4. `redeemPackageSitting`'s mutation call used the wrong GraphQL argument
   shape (two scalars instead of a wrapped `input`) — the entire
   redeem-a-sitting feature was non-functional from the day it shipped.
   The exact Hard Rule 7 bug class, caught only by a real HTTP round trip.
5. `packages.service.ts` rejected every real product a package could ever
   reference, since `createProduct` never sets a `clinic_id` (every real
   product is an org-level master) while the validation demanded strict
   equality. Fixed to accept a master product gated on matching org
   instead, matching `REQ055`'s branch-overrides convention — the
   identical bug, client-side, was also found and fixed in
   `manager/packages/index.jsx`'s own product filter.
6. Three real accessibility gaps (a checklist checkbox, admin users' own
   "Impersonate" button, finances' Approve/Reject buttons) each had a
   `Tooltip` but no `aria-label` — no accessible name at all, not just a
   test-locator inconvenience.
7. A genuine, previously-undocumented MUI `Select` finding: its
   accessible name concatenates the label with the selected value once
   one is set (both ids sit in its own `aria-labelledby`), so
   `getByLabel('X', {exact: true})` stops matching after the first
   selection. **When a future `Select` needs to be targeted reliably
   after it can hold a real value, give it a `data-testid` — don't rely
   on `getByLabel`/`getByRole(..., {name})` once a value can be set.**

Also confirmed live (again): **a targeted `docker rm -f`/`docker compose
up -d` on one wedged container can itself hang, with `docker ps` staying
responsive throughout** — this happened twice this session. The fix both
times was the full established recovery (quit Docker Desktop entirely,
relaunch, wait for the daemon, *then* `docker rm -f`/`compose up -d` the
one container) — not more targeted retries.

### A fresh backend↔frontend integration gap audit, and its first fix (2026-08-25)

`project-plans/08-integration-gap-analysis.md` is a fresh sweep — every
backend `@Query`/`@Mutation` cross-checked against real frontend usage,
and every remaining `mocks/store`/`useMockData` import in `frontend/src/
pages` individually re-classified — producing 12 real findings (severities
S2-S4) plus one S1: **`pages/clinician/Dashboard.jsx`, the clinician
role's own home screen, was fabricated end to end.** Its read query
targeted the wrong (public, patient-self-serve) GraphQL dialect with
fields that don't exist on the real return type — a guaranteed validation
error on every request — permanently masked by an `isMock = !data`
fallback into fully-formed fake sample data, with both write actions
("Save Block", "Mark Complete") also entirely local-only. Closed the same
day (`BUG021`/`PLAN083`/`TP110`/`TR109`, new `clinician-dashboard` feature
slug, `context/clinician-dashboard-2026-08-25-bug021/manifest.md`) —
rebuilt onto the real, already-authenticated `appointments(...)` query
(self-scoped via the JWT, the same primitive `clinician/Calendar.jsx`
already uses) plus the real `createSpacerBlock`/`completeAppointment`
mutations, with a new dedicated `network-only` profile query working
around the same `AuthContext` login-cache gap already documented above
for `user.patient.id` — now confirmed to also apply to `user.clinician`.

One more real gap found while scoping the fix, not by a failing test:
`createSpacerBlock`'s own `@Auth` gate excluded `'clinician'` entirely
(manager/admin/super_admin only), while its sibling read query
(`getSpacerBlocks`) had already been correctly widened for this exact
caller — the write path never got the matching change. Without also
widening it (plus a service-level self-scope check mirroring
`getSpacerBlocks`'s own), the rebuilt page's "Save Block" action would
have 403'd for every real clinician. Verified with a new
`frontend/e2e/clinician-dashboard.spec.js` (3/3, against the real
backend, reload-survives checks on both write actions — not just an
in-memory state read), which itself surfaced a second, unrelated real
bug worth knowing for any future fixture code on this host: **a fixed
local-clock-hour `Date#setHours()` fixture is timezone-ambiguous** on
this IST (UTC+5:30) host — an early-morning local hour can convert to
the *previous* UTC calendar day, silently missing a UTC-bounded
`date_from`/`date_to` "today" filter and colliding with its own earlier
run's leftover fixture on that other day instead of failing loudly (the
same class of gap as `context/open-questions.md` #15, now confirmed to
also bite a plain host-side `Date` computation, not just a container's
missing `TZ`). Fix: anchor a "today" fixture to `Date.now()` minus a few
hours, never to a fixed local clock hour.

**A-1 (password reset) closed the same day, `BUG022`/`PLAN084`/`TP111`/
`TR110`** — `pages/auth/forgot-password.jsx` only ever called the first
step (`forgotPassword`); the real, already-tested `resetPassword`
mutation had no page that ever called it, so the flow dead-ended at
"check your inbox" for every account. New `pages/auth/reset-password.jsx`
(token from the URL query string — the delivery mechanism today is a
`[EMAIL STUB]` console log, no real AWS SES send exists yet, a
pre-existing separate gap) plus a `/reset-password` route. Verified with
a new `frontend/e2e/reset-password.spec.js` (3/3): a real `forgotPassword`
call, the real token read straight from the backend's own stub log, a
real `resetPassword` completion, and a real subsequent login proving the
new password was actually persisted (and the old one now rejected) — not
just a UI success message. Also folded in §C's one-line correction (the
`admin-roles.spec.js` note above, now marked stale-as-of-2026-08-25).

**B-2 (`appointments/edit.jsx` mock fallback) closed the same day,
`BUG023`/`PLAN085`/`TP112`/`TR111`** — reading the whole file to fix the
narrowly-scoped originally-flagged dropdown fallback surfaced four more
real defects in the same file, the worst found only by live-testing the
fix, not by reading code: **`AppointmentUpdateInput` has no
`end_datetime` field**, and `edit.jsx`'s `handleSubmit` sent one
unconditionally — since `form.end` is always populated from the loaded
appointment, this rejected the mutation at the GraphQL variable-coercion
layer on **every single save, unconditionally**. A real user clicking
"Save Changes" on this page has never once succeeded, since the day it
shipped. Confirmed live twice (including once with `click({force: true})`
to rule out an unrelated click-interception cause) — the browser console
captured the exact rejection (`Field "end_datetime" is not defined by
type "AppointmentUpdateInput"`), and a direct backend query after each
attempt confirmed nothing had persisted. Fixed by removing `end_datetime`
from the mutation input entirely and disabling the "End Date & Time"
picker (not independently editable on this backend — it's derived from
the service duration), plus: real `error`-gating on the clinician/room
dropdowns and the appointment fetch itself (the originally-flagged
finding), a real not-found state instead of an infinite loading skeleton
for a genuinely-deleted appointment, no more silent "mock mode" fake
success on a real save failure, and a missing `'scheduled'` status option
(the real default status of a freshly-created appointment). Filed under a
dedicated `appointments` feature slug (`BUG023`) rather than the
`platform-nfr` slug this document originally suggested for B-2 — matching
B-1's own precedent, this turned out scoped to one file's own defects,
not a cross-cutting completion pass. **Read this before assuming any
existing e2e coverage of `appointments/edit.jsx` proved the save flow
worked** — none existed before this fix; the new
`frontend/e2e/appointments-edit.spec.js` is the first.

**A-2/A-3 (pharmacy drug catalog + dispense/history) closed the same day,
`REQ059`/`PLAN086`/`TP113`/`TR112`** — `pages/manager/pharmacy/index.jsx`
wired *receive* and *adjust* only; the real, already-tested
`createDrug`/`updateDrug`/`deleteDrug` and
`dispensePrescriptionItem`/`stockMovements` operations had no frontend
UI at all, leaving `REQ022`'s own "receive → dispense → adjust" design
two-thirds built. The page is now three tabs — Stock (unchanged), Drug
Catalog (new CRUD, platform-seeded rows hide edit/delete matching the
backend's own write restriction), Dispense (new — patient search → real
prescriptions/items → a batch picker restricted client-side to the
matching drug → `dispensePrescriptionItem`) — plus a "History" action on
each Stock-tab batch row. A real, additional gap found while
implementing, not in the original scope: `/manager/pharmacy` was
manager-only gated on *both* the route (`App.jsx`) and the sidebar
(`AppShell.jsx`'s `NAV_CONFIG`), while `pharmacy.resolver.ts` has always
allowed `staff` too — real pharmacy staff had no way to reach or even
discover a page the backend already let them use. Fixed by moving the
route into the existing staff-inclusive `RoleGuard` block and promoting
"Pharmacy" to a top-level nav entry, matching how "Patients"/
"Clinicians"/"Live Queue" already sit outside the manager-only
collapsible section for the identical reason. **Read this before
assuming a `/manager/...` route's role gate matches its backend
resolver** — this is now the second instance this session found of a
frontend route/nav gate narrower than its real backend `@Auth()` (the
first being Phase G+3's own `webhooks`/`api-keys` finding, see that
section above) — check both, not just one.

**A-4 through A-9 (six S3/S4 additive UI slices) closed the same day,
`REQ060`–`REQ064`/`PLAN087`–`PLAN091`/`TP114`–`TP118`/`TR113`–`TR117`** —
all code written first, one combined unit+e2e verification pass at the
end, matching this document's own established Phase G+2/G+3 batching
precedent. Unlike that precedent, this batch split into five separate
`REQ`/`PLAN`/`TP`/`TR` doc sets (one per feature slug — `security`,
`clinical-records`, `insurance-claims`, `platform-integrations` (twice,
A-8 and A-9 separately); A-5/A-6 shared one slice since the findings
themselves were already paired), since these are newly-discovered gaps
in unrelated, already-shipped requirements, not one cross-cutting
backend batch's own already-known "frontend deferred" note. **A-4**: a
verification chip + Verify/Reject/Re-open-for-review actions on
`clinicians/detail.jsx` (admin/super_admin-gated, matching
`updateClinicianVerification`'s own gate). **A-5/A-6**: a "Diagnoses"
section + "Add Diagnosis" dialog, and a "Save as template" action, both
on `EncounterWorkspace.jsx` — closes a real chicken-and-egg gap
(`REQ020`'s own one-click-template feature had no way to ever seed its
first template through the app). **A-7**: a new "Insurance" tab on
`patients/detail.jsx`, real GraphQL keyed on the real route `:id` even
though the rest of that page is still mock-driven pending a separate,
unrelated product decision (`context/open-questions.md` #13 — insurance
is not one of that note's five paused sub-features). **A-8**: a
"Delivery Log" button per webhook endpoint row on `settings/index.jsx`'s
Integrations tab. **A-9**: an "Edit" action per booking-widget-config
row on the same Integrations tab, calling `updateBookingWidgetConfig`
without ever touching `short_link_slug` — closes the
deactivate-and-recreate footgun that used to break every embed already
pasted onto a real customer's site.

One real bug found, in the shared e2e fixture file
(`frontend/e2e/gap-analysis-a4-a9.spec.js`, renamed mid-batch from
`gap-analysis-a4-a8.spec.js` once A-9 was folded in) itself, not in any
slice's product code: its own `psql()` cleanup helper was missing a
`return` statement, so a "find existing Payer, else create one"
idempotency check always fell through to "create" — silently
accumulating duplicate same-named `Payers` rows across repeated test
runs until the payer-picker's own option locator broke. Fixed, and every
statement in that file's `afterAll` now runs through a `safePsql`
wrapper (catches and logs rather than throwing) so one failing cleanup
statement can no longer abort every statement after it — confirmed via a
direct DB check that a full run now leaves zero residue.

**This closes out every real, actionable finding in the gap analysis.**
`A-10` remains open but is explicitly **not a new discovery** —
`PLAN077`/`REQ054` and `PLAN082` already logged it as a deliberate scope
cut, listed in the gap analysis only for completeness. `B-4` is S4,
known, and already correctly deferred (a fully mock page with no backend
domain to wire to yet). `B-3` turned out to be a stale-documentation
finding, not a real gap — `pages/onboarding/index.jsx` was already wired
to the real `organization-onboarding` backend (`REQ045`, 2026-08-23)
*before* the gap analysis was written; nobody had re-read the file
before classifying it. Found via `scripts/check-page-data-wiring.mjs`'s
own "no longer looks fabricated" self-check on its `ALLOWED` list, fixed
same day (removed from `ALLOWED`; corrected this file's own two stale
"3 pages... onboarding, tasks, waiting-room" mentions — only `tasks`
still qualifies). **The lesson**: a gate's exemption list is only as
current as the last time someone re-read the file it exempts — verifying
it is part of running the gate, not an optional extra step.

### What Phase F did NOT close — read before assuming coverage

- **Tenancy matrix now covers 31 tenant-scoped domains plus 12 honestly-EXEMPT
  ones** (closed 2026-08-23, `BUG012`; grew again 2026-08-24 during `REQ020`'s
  own matrix-coverage pass, which found `resources`/`drugs`/
  `organization-onboarding` had shipped unclassified — see the Phase G note
  above; grew again the same day during Phase G+2's own 8-slice pass, which
  added 7 new `CASES` domains — `booking-widget`, `consent`, `pharmacy`,
  `webhooks`, `insurance`, `api-keys`, `scheduled-reports` — plus one new
  `EXEMPT` entry, `plans`, platform-level like `organizations`) — this used
  to say "12 of 22" here; it doesn't anymore. `KNOWN_GAPS`
  is `[]`. Re-verify this count against `backend/test/integration/setup/
  domain-cases.ts` before trusting it, not this sentence — it will drift
  again the next time a new resolver domain ships. What Phase F's own closure
  still did NOT
  reach is `project-plans/06-execution-plan.md`'s P1 items **1.5** (a
  realistic seed dataset + a separately seeded e2e database) and **1.6**
  (frontend unit tests for `AuthContext`/`ProtectedRoute`/booking-wizard
  validation/currency-date utils) — both still open, sequenced as their own
  future slices. `project-plans/technical-plans/00-foundation-hardening.md`
  is "Phase F" in that root's own language (`07-prd-gap-analysis-and-roadmap.md`:
  "Phase F = `project-plans/06-execution-plan.md` P0 + P1, unchanged") — read
  it, not just this file, before treating Phase F as fully closed; P1 isn't,
  yet.
- **e2e is not in CI**, deliberately (F-27: smoke-weighted, no negative-RBAC;
  F-28: runs against the dev database and leaves rows behind). A check allowed to
  fail reads as coverage while proving nothing.
- **The CI workflow has never executed on GitHub.** Every command in it passes
  locally; the pipeline itself is unproven.
- **1 page renders fabricated data** — `tasks` — and only because **no backend
  domain exists** for it (Priority 2). This used to say "3 pages... onboarding,
  tasks, waiting-room" here; both `onboarding` (`REQ045`, 2026-08-23) and
  `waiting-room` (`REQ042`) were wired to real backends since, and this
  sentence simply never got updated — found stale 2026-08-25 by
  `scripts/check-page-data-wiring.mjs`'s own "no longer looks fabricated"
  self-check on its `ALLOWED` list, not by a fresh audit; re-verify this count
  against a real `git log`/file read before trusting it, not this sentence.
  The other seven the gate found were wired in `BUG009`; `manager/Billing` was
  deleted and `/manager/billing` now redirects to `/finances`, which it
  duplicated.
  **Those six wired pages have had no live browser pass** — they compile, lint,
  build and query a schema-valid contract, and the backend contracts are covered
  by the integration suite, but nobody has driven the routes against real data.
  Do that before trusting them end to end.
- **`scripts/check-page-data-wiring.mjs` is the tool that found them.** Run it
  before claiming a page is real. It asks "does a file that renders data have
  *any* route to real data", which is what four `mocks/store` greps could not —
  those pages declare their own `MOCK_*` arrays.
- 177 frontend lint warnings (ratcheted, may only go down — 197 before BUG009)
  and 33 lines of schema-vs-database drift remain.

Directory contract:
- `<root>/<feature-name>/{requirement,improvement,bug}/*.md` across all five roots.
- The same `feature` slug and the same parent ID thread a work item through every root and its `context/` bundle.
- Frontmatter (`id`, `type`, `feature`, `created`, `updated`, `status`, `parent`, `related`) is mandatory on every document.

Working loop for all future work in this repo:
1. Classify the incoming work as requirement, improvement, or bug, and identify its feature slug (reuse an existing slug; only create a new feature directory when the work genuinely belongs to no existing feature).
2. Write the doc into `requirements/<feature>/<category>/` with a fresh ID and full frontmatter, then update that feature's README and the root README.
3. Enter plan mode and explore the code BEFORE writing any implementation. Record the plan in `implementation-plans/<feature>/<category>/` with `parent` set to the requirement ID.
4. **Suggestion stage is conditional, not automatic** (decided 2026-08-22, `REQ013` Phase D — see `context/open-questions.md` #9): for a genuinely exploratory or ambiguous feature (a new domain, an unclear contract, first-of-its-kind UX), draft candidate tests into `test-suggestions/<feature>/<category>/` first — these are UNREVIEWED, never treat a test-suggestion as an approved test — then promote to `test-plans/<feature>/<category>/` (new TP### ID, `parent` set) only after human review. For a well-scoped slice against an already-proven pattern (a routine CRUD domain matching an existing contract, a bug fix, a small additive change), the suggestion stage may be skipped and a test-plan drafted directly — it still needs the same human review before being treated as approved; skipping the stage is not skipping the review.
5. Implement, then run the approved test-plans and record outcomes in `test-results/<feature>/<category>/` with pass/fail and the commit SHA.
6. Create or update `context/<feature>-<date>/manifest.md` at every step above so the bundle never drifts from reality.
7. Do not set a requirement's status to `done` until a `test-results` document with a passing outcome exists and is linked from the bundle.
8. Keep every index current in the same change that adds or moves a document — a stale index is worse than no index.

## Hard rules — non-negotiable

1. **No skipped steps.** Each item in "Current priorities" below has a Definition of Done (DoD). Don't move to the next until the current one's DoD is fully satisfied. If you can't satisfy it, stop and say why — don't silently move on or mark it done anyway.
2. **Test before you claim done.** "I wrote the resolver" is not done — "the test suite proves the resolver works, including tenant-isolation and validation-failure cases" is done. Every new or touched resolver/service gets unit tests; every user-facing flow gets an integration/e2e test (`npm run e2e` in `frontend/`, Playwright). All 22 backend domains now have `.spec.ts` coverage (see Current priorities) — the remaining Priority 1 gap is per-domain e2e coverage, not unit coverage.
3. **Verify before you commit.** Run lint + typecheck + the full test suite (backend `npm test`, frontend `npm test` and `npm run e2e` for touched flows) and confirm green before every commit. Never commit red.
4. **Commit per vertical slice, same branch.** After a slice is built, tested, and verified, commit it with a conventional-commit message (`feat(backend): ...`, `test(backend): ...`, `feat(integration): ...`). Stay on the current branch unless explicitly told otherwise. Small, frequent, verified commits — not one giant commit at the end.
5. **Responsiveness is tiered and mandatory, not polish.** Full detail and the measured audit behind this live in `project-plans/technical-plans/06-frontend-architecture-and-mobile.md`; the rules in short:
   - **Declare the screen's tier and verify at that tier's widths.** *Mobile-first* (public booking, patient PWA, QR check-in, patient portal) — designed for 360px, full function, verify 360/414/768. *Tablet-first* (clinician consult, Rx builder, clinician calendar) — designed for 1024px, verify 768/1024/1280; on a phone it must be readable and scrollable, not necessarily efficient. *Desktop-dense* (front desk, billing, admin, reports, pharmacy POS) — designed for density, verify 1280/1440; at 360px scrolling is fine but **truncated data is not**. A flat "check 360/768/1280 everywhere" rule asked the billing console to meet the patient booking page's bar, and so got ignored — this replaces it.
   - **No silent truncation, ever.** Content wider than its container must *scroll*, not clip. `overflow-x: hidden` on an ancestor of tabular or form content is a bug, and every `<Table>` needs a `<TableContainer>`. This has now been violated three times; two were found by accident. **`document.scrollWidth > clientWidth` does NOT catch it** — it reports clean on both live-confirmed defects (a truncated column on `/dashboard`, and the entire unreachable "In-App" column on `/settings`). Use the element-level probe in `06-frontend-architecture-and-mobile.md` §7.
   - **Theme tokens only — no `#RRGGBB` literals** in `pages/`, `components/`, `layouts/`. 87 of 122 files currently bypass the real theme that already exists (`#006D77` appears 264 times), which is why `REQ002`'s shipped org-branding feature cannot actually re-theme the product.
   - **Type and touch floors:** patient-facing ≥16px body text and ≥44×44px touch targets (WCAG 2.5.5, and the PRD's own §13 commitment); staff-facing may go denser but never below 14px/36px.
6. **Multi-tenancy is a security boundary, not a filter.** Every tenant-scoped query/mutation filters by `req.user.client_org_id` from the JWT — never a client-supplied `client_org_id`/`org_id` argument (see Architecture). Write at least one test per resolver proving cross-tenant access is rejected. This applies to **every** write path, not just reads: a `create*` mutation that takes a `clinic_id` in its input must validate that clinic belongs to the caller's org — a real, repeated bug class found across five different domains (`createAvailability`, `createSpacerBlock`/`createRoomBlock`, `createClinician`, `createAppointment`) where `update`/`delete` had the check (they look up an existing record first) but `create` didn't, since it had no natural place to hang the check without deliberately adding one.
7. **Match the existing contract, don't invent a "reasonable" one.** Before writing or changing a resolver, check `frontend/src/graphql/*.js` (or the page's inline `gql`) verbatim for field names, nullability, argument shape, and which of the three mutation-response conventions the consuming page already expects (see Architecture). Skipping this has caused real bugs before.
8. **Don't silently paper over the mock fallback.** Once a domain has a real backend module, the frontend should call it for real. If you find a page still falling back to `mocks/store.js` for a domain that now has a backend module, that's a bug to flag and fix, not something to leave alone.
9. **Vendors are fixed except OTP/notification-channel providers, which are admin-configurable per org**: Razorpay (patient payments), Stripe (tenant SaaS-subscription billing only), AWS SES `ap-south-1` (email) — don't substitute a different provider "for simplicity," build/test against the real one with sandbox credentials. **OTP SMS is the one deliberate exception** (decided 2026-08-21, see `REQ008`): rather than a single hardcoded vendor, each org picks its own provider (MSG91, Gupshup, Twilio, AWS SNS, ...) from a registry and enters that provider's own credential shape via admin settings, encrypted at rest — a standard multi-tenant SaaS pattern, not a "for simplicity" shortcut. Money is paise (`Int`), converted to rupees only at the resolver boundary.
10. **Genuine ambiguity → stop and ask.** Schema doesn't cover a field the UI needs, a contract mismatch, an unclear business rule — don't invent the answer. Note it in `context/open-questions.md` either way — an empty/absent entry for a given topic means nothing's been logged on it, not that nothing's open; check the file before assuming a question hasn't already been raised.

## Stack

- **Frontend** (`frontend/`): React 18 + Vite + MUI v5 + Apollo Client. Mostly built.
- **Backend** (`backend/`): NestJS + Apollo GraphQL (code-first, decorators — not SDL-first) + Prisma + PostgreSQL + Redis. 22 domain modules built (see Architecture below); this replaced an original Laravel scaffold, which is gone.
- **`backend/prisma/schema.prisma`** is the authoritative data model (36+ models). Run `prisma validate` after editing it.
- Orchestration is Docker Compose (`docker-compose.yml`) — services `medibook_backend`, `medibook_frontend`, `medibook_postgres`, `medibook_redis`. **`Makefile` at repo root is stale** (targets Laravel/MySQL/PHP-FPM/Nginx, a pre-pivot stack) — don't use it; use the commands below instead.

## Commands

### Running the stack

```bash
docker compose up -d              # start postgres, redis, backend (nest start --watch), frontend (vite dev)
docker logs medibook_backend --tail 50 -f   # backend watch output — "Found 0 errors" = compiled clean
docker restart medibook_backend   # required after `prisma generate` — the running ts-node/tsc watch
                                   # process caches the old Prisma Client types and won't pick up a
                                   # regenerated client on its own; an incremental recompile alone
                                   # produces stale "property does not exist" errors until restarted
```

Never run `npm run build` inside the same container as the active `start:dev` watch process — it corrupts `dist/` and crashes the watched app (`MODULE_NOT_FOUND`); the watch process's own "Found 0 errors" log is the correct way to verify a clean compile. Recover with `docker restart medibook_backend`.

### Backend (`backend/`, or `docker exec medibook_backend <cmd>`)

```bash
npm run start:dev        # nest start --watch (this is what the backend container runs)
npm run lint              # eslint --fix
npx jest --maxWorkers=2   # THE way to run the unit suite here — 645 tests / 50 suites, ~130s.
                          # A bare `npm test` (default workers) gets OOM-killed on this host (exit 137).
                          # `account`/`staff` also time out on bcrypt under contention but pass
                          # in isolation — re-run a suspect suite alone before believing a failure.
npm run test:int          # integration suite — 120 tests / 3 suites, ~117s, REAL Postgres + real
                          # HTTP. Prerequisite: docker compose --profile test up -d postgres_test
                          # MUST run from the host (cd backend && npm run test:int), NOT
                          # `docker exec medibook_backend npm run test:int` — its postgres_test
                          # connection is hardcoded to localhost:5433, a host-side port mapping
                          # the container's own network namespace can't resolve to the real
                          # postgres_test service (found 2026-08-24, PLAN073)
npm run test -- <pattern> # run a single test file/suite, e.g. `npm run test -- appointments.service`
npx prisma validate        # validate schema.prisma after editing it
npx prisma migrate deploy  # apply migrations
npx prisma generate        # regenerate Prisma Client — ALWAYS follow with docker restart medibook_backend

# Integration/tenancy suite (BUG007) — separate throwaway database, never the dev one
docker compose --profile test up -d postgres_test   # port 5433, tmpfs; not started by a bare `up -d`
npm run test:int                                    # boots the real AppModule against it
```

**`prisma migrate dev` cannot run non-interactively in this environment** (confirmed — refuses even with `--create-only`). Every schema change ships as a **hand-written migration SQL file** under `backend/prisma/migrations/<timestamp>_<name>/migration.sql`, matching Prisma's own naming/constraint conventions, applied via `prisma migrate deploy`. Migrations don't get Prisma's diff/review safety net this way — read every migration end-to-end against the `schema.prisma` diff before applying it, every time.

Seed data: `npx prisma db seed` runs `backend/prisma/seed.ts` — seeds 5 demo accounts (`admin@medibook.dev` / `Admin1234!`, and `manager@`, `clinician@`, `receptionist@`, `patient@medibook.dev` with role-suffixed passwords, e.g. `Mgr1234!`), 5 email templates, and reference data.

### Frontend (`frontend/`)

```bash
npm run dev                # vite dev server
npm run lint / npm run lint:fix
npm test                   # jest --coverage
npm run test:watch
npm run e2e                # playwright test
npm run e2e:ui              # playwright test --ui
```

The host's default `node` may be older than Playwright's ESM config loader requires (Node ≥18.19 — confirmed failing on a v18.13.0 default with `Playwright requires Node.js 18.19 or higher`). If `npm run e2e` fails immediately on `playwright.config.js` with that error, switch to a newer Node first (e.g. `nvm use 20`) before retrying — it's an environment issue, not a config bug.

## Architecture

### The frontend still has a live mock-data fallback layer — check before assuming a page is real

`frontend/src/apollo/client.js`'s `httpLink` wraps every request in a 10s `AbortController` timeout (tuned up from an original 2s, which misread slow-but-real responses as "offline"); `frontend/src/mocks/store.js` is a full in-memory backend simulation many pages fall back to on network failure or (for pages never wired to GraphQL at all) use exclusively. **Do not assume a page "using GraphQL" talks to a real backend** — grep the page for `gql\``/`useQuery`/`useMutation` and check whether it imports from the canonical `frontend/src/graphql/{queries,mutations}.js` or defines its own inline operations, then cross-check against which `backend/src/*` modules actually exist (below). `context/backend-api-requirements-master-plan.md` has the full per-page audit (75 pages + 55 components, none skipped).

Backend domain modules that exist today (`backend/src/`, re-verified 2026-08-25 against a real `ls`): `auth`, `account`, `clinics`, `rooms`, `resources`, `departments`, `lookups`, `organizations`, `organization-onboarding`, `languages`, `email-templates`, `services`, `products`, `drugs`, `clinicians`, `test-results`, `patients`, `appointments`, `appointment-payments`, `availability`, `blocks`, `encounters`, `prescriptions`, `queue`, `users`, `staff`, `notifications`, `notification-preferences`, `reviews`, `messages`, `public`, `analytics`, `dashboard`, `org-settings`, `cancellation-rules`, `booking-widget`, `plans`, `consent`, `pharmacy`, `webhooks`, `insurance`, `api-keys`, `scheduled-reports`, `checklist`, `intake-fields`, `break-glass`, `packages`, `branch-overrides`, `documents`. The last six landed in this session's own "Phase G+3" batch (`REQ051`–`REQ058`) — `documents` is REST-only (no `.resolver.ts`), the others follow the usual GraphQL shape. Each follows the same file layout: `<domain>.module.ts`, `<domain>.resolver.ts`, `<domain>.service.ts`, `dto/*.input.ts` (validated `@InputType()` classes), `entities/*.entity.ts` (`@ObjectType()` classes, GraphQL type names sometimes deliberately differ from the Prisma model name — see below). This list drifts as new domains land each session — cross-check `ls backend/src/` before trusting it for a "does X have a backend" question. Priority 2 is now fully complete (as of 2026-08-21) — organization Branding (`REQ002`), Communications' own "Notification Templates" tab (`REQ011`), and admin's "Security settings" tab (`REQ012`) are all closed, see Priority 2 below.

### `App.jsx`'s route tree has one path claimed twice — know this before adding a pathless layout route

`/` was unreachable end-to-end until fixed 2026-08-23: it's declared explicitly (`<Route path="/" element={<Landing/>}>` under `PublicLayout`) *and* implicitly, by a pathless `<Route index element={<RoleHomeRedirect/>}>` nested three layout-routes deep under `<Route element={<ProtectedRoute/>}><Route element={<AppShell/>}>` — neither of those wrapping routes declares its own `path`, so they don't consume a URL segment, and the `index` route ends up matching "/" too. React Router v6 scores `index` routes higher than an explicit `path="/"` route on an otherwise-tied match, so the index route always won: an authenticated visitor to "/" got silently redirected to their dashboard (looked correct, wasn't), an anonymous one got bounced through `ProtectedRoute` straight to `/login` — the public marketing/booking landing page was unreachable for anyone, ever, and no test caught it because every e2e spec logs in and lands on a role-specific path first. Fixed by making the root route itself auth-aware (`RootRoute`, mirroring the existing `OptionalAuthShell` pattern used for `/appointments/book`) instead of relying on two separately-declared routes to both resolve "/". **The lesson, not just the fix:** any new pathless layout `<Route element={...}>` added directly under `<Routes>` (not nested under an already-pathed route) is a candidate to silently collide with whatever else claims that same effective path — check what it actually resolves to, don't assume route declaration order or explicitness wins.

### `receptionist` is a dead role name — the real seeded role is `staff`, and the mistake recurs

`backend/prisma/seed.ts`'s `ROLES` array and every real JWT/RBAC check use `staff`, never `receptionist` — but `receptionist` keeps getting reintroduced as if it were the real name, because it reads like a plausible one. Confirmed live 2026-08-23 in three separate places, each a real bug, not dead code: `layouts/AppShell.jsx`'s `ROLE_COLORS` map (keyed `receptionist`, missing `staff` → every staff/receptionist account's sidebar badge silently fell back to `ROLE_COLORS.patient` and showed "Patient"); `pages/admin/users/index.jsx`'s `ROLE_STYLES` map (same shape, plus `admin`/`super_admin`/`manager` were *also* missing under stale `system_admin`/`clinic_manager` keys — falls back to a grey "Unknown" chip); `pages/clinicians/index.jsx`'s inline `isAdmin` role check (missing `staff` entirely → the "Add Clinician" button silently didn't appear for staff users). `App.jsx`'s `NAV_CONFIG` already lists both `'receptionist'` and `'staff'` in its role arrays — harmless there since `'staff'` is also present — but don't copy that array as a template assuming `'receptionist'` is a name worth keeping; it's dead everywhere it isn't paired with `'staff'`. When adding a new role-keyed map, key it from `backend/prisma/seed.ts`'s `ROLES` array, not from an existing frontend map — several of the existing ones are themselves wrong.

### Auth is a global guard, fail-closed by default

Three `APP_GUARD`s run in this exact order (`backend/src/app.module.ts`): `GqlThrottlerGuard` → `GqlAuthGuard` → `RolesGuard`. **This ordering is load-bearing** — NestJS always runs `APP_GUARD`-registered global guards before any handler-level `@UseGuards()`, regardless of decorator order at the call site, so `GqlAuthGuard` itself had to become global (not just paired per-handler) to guarantee `req.user` is populated before `RolesGuard` checks it. Every new resolver is authenticated by default; add `@Public()` (`common/decorators/public.decorator.ts`) only for a resolver that must genuinely work logged-out (verify this is actually true — it's the one annotation that removes a security guarantee). `@Auth('role', ...)` (alias for `@Roles()`) gates by role on top. `JwtPayload` (`auth/strategies/jwt.strategy.ts`) carries `{ sub, roles, client_org_id, patient_id, clinician_id }` — `client_org_id` is `null` for platform-wide roles (admin/super_admin), not just absent; `patient_id`/`clinician_id` are `null` for every role except the one they apply to, and for a `patient`/`clinician` account not yet linked to a `Patients`/`Clinicians` row (both seeded demo accounts are currently in this unlinked state — self-scoped queries correctly return empty for them, not "everyone," see below).

Real-time subscriptions (`appointmentUpdated`, `messageReceived`) run over `graphql-ws`, sharing the same passport-jwt auth: the WS connection's `connectionParams.authorization` is synthesized into a fake `req.headers.authorization` object in `app.module.ts`'s `context` factory, so the existing HTTP-path guard logic works unchanged for both transports. `GqlThrottlerGuard` explicitly exempts subscription operations (its HTTP-shaped `res.header()` call otherwise throws against the WS connection's synthetic response object). PubSub is single-process in-memory (`graphql-subscriptions`, `common/pubsub.module.ts`) — correct for the current single-backend-instance deployment; swapping to a Redis-backed PubSub (a client is already provisioned in `redis/redis.module.ts`) is a one-line change if ever scaled to multiple instances.

### Multi-tenant scoping comes from the JWT, never a client-supplied argument

Every query/mutation touching a tenant-scoped model filters by `req.user.client_org_id` (via `@CurrentUser()`), sourced from the JWT — never a `client_org_id`/`org_id` GraphQL argument, which would be a direct cross-tenant IDOR. Models without their own `client_org_id` column (Appointments, Availability, Blocks, Reviews, Patients, etc.) scope indirectly through a relation (typically `clinic.client_org_id`). An org-less caller (admin/super_admin, `client_org_id: null`) generally sees everything rather than nothing — this is the deliberate default, not a bug, for records that predate an org linkage existing on their table (e.g. clinics created before the Organizations module existed have no `client_org_id` at all yet).

### Org-level scoping is necessary but not sufficient — patient/clinician self-scoping is a separate, easy-to-forget layer

`client_org_id` answers "which tenant" but not "which specific patient/clinician within that tenant." A `patient` caller must additionally be restricted to their own row (`patient_id` from the JWT); a `clinician` caller must additionally be restricted to their own schedule/patients (`clinician_id` from the JWT, or — for the Patients domain specifically — an `appointments: {some: {clinician_id}}` relationship check, since "which patients has this clinician actually treated" isn't a direct FK). This was missing entirely across `appointments`, `patients`, and `testResults` (any patient could read every patient's data in the org) and on the clinician-availability-self-service write path (any clinician could edit/delete any other clinician's schedule, across orgs) until a dedicated audit pass found and fixed it — see each service's `selfScope()`/`assertClinicianAccess()` helper for the current pattern to replicate on any new patient- or clinician-facing resolver. An unlinked account (`patient_id`/`clinician_id: null`) must fail closed (empty result), never fall through to unscoped — every `selfScope()` implementation uses a sentinel value (e.g. `'__no_patient_link__'`) as the filter rather than skipping the filter when the id is null, specifically to guarantee this.

### Two competing GraphQL naming dialects exist simultaneously, on purpose

- **Canonical/admin dialect** — `frontend/src/graphql/{queries,mutations}.js`, matched field-for-field by every domain module above: **snake_case** (`first_name`, `start_datetime`, `client_org_id`), page-based pagination (`{data, paginatorInfo}`), mutations return the entity directly.
- **Public/patient-self-serve dialect** — `backend/src/public/**`, matched to `public/landing.jsx`, `public/doctor-profile.jsx`, `booking/index.jsx`, `video/index.jsx`'s own inline `gql`: **camelCase** (`firstName`, `startTime`, `clinicianType`), `getX`/`getXs`-prefixed query names.

These were kept deliberately separate rather than unified — GraphQL can't register two resolvers or two input types under one name, and the "public" pages had no live backend to preserve, so where a genuine collision existed (`createAppointment`/`AppointmentInput`), the public-dialect one was renamed (`bookPatientAppointment`/`BookPatientAppointmentInput`) rather than the already-live canonical one touched. Before writing any new resolver, check `frontend/src/graphql/*.js` (or the specific page's inline `gql`) verbatim for field names, nullability, and argument shape — never assume a "reasonable" shape; this has caught real bugs every time it was skipped (a returned `token` field the frontend actually reads as `access_token`, a GraphQL type that had to be named exactly `User` not `AuthUser` to satisfy a fragment, `LOGOUT_MUTATION` expecting a bare scalar not an object).

### Three mutation-response conventions coexist — match whichever the consuming page already uses

Some domains (`Languages`, `RoomTypes`, `ClinicianTypes`, `EmailTemplates`, `Organizations`, `Availability`, `Blocks`, some `Rooms`/`Products` pages) return `{success, userErrors[, entity]}`. Everything importing the canonical `graphql/mutations.js`, plus `Staff`/`Notifications`(`{success}` only)/`Reviews`/`Messages`/`Public`, returns the entity directly. Do not "fix" this into one convention — each domain's choice matches its real, already-exercised frontend contract.

### India-specific decisions (apply wherever payments/SMS/email/currency/address come up)

Razorpay (patient payments) · Stripe (kept only for tenant SaaS-subscription billing) · MSG91/Gupshup (OTP SMS) · AWS SES `ap-south-1` (email) · AWS `ap-south-1` hosting · GST fields on `PaymentTransactions` · money stored as **paise** (`Int`), converted to rupees at the resolver boundary for the GraphQL layer, never in the schema · address format is `{line1, line2, city, state, pincode, country}` (India), not a Western `{address, city, postal_code, country}` shape — note `Clinics.address`/`city`/`postcode` is still the older flat Western shape (a known, documented, not-yet-reconciled inconsistency with `ClientOrganizations`/`Patients`' structured India address).

### Where to go deeper

**For new PRD-derived work**, start at `project-plans/technical-plans/README.md` —
`05-cross-cutting-conventions.md` (module scaffolding, dialect/response decision
tables, per-slice DoD) is the shortest and everything else assumes it, then the
phase document you're working in, plus `04-data-model-evolution.md` whenever you
touch `schema.prisma`.

**For what's already built**, `context/README.md` indexes everything: `context/backend-hard-rules.md` and `context/frontend-hard-rules.md` are the fuller mandatory-rules documents this section summarizes (multi-tenancy, DTO validation, error formatting, Prisma transaction discipline, responsiveness breakpoints, accessibility, mock-vs-real-data hygiene — each grounded in a real finding, not generic advice). `context/backend-api-requirements-master-plan.md` is the full per-file frontend audit and cross-cutting conflict list. `context/next-10-features-implementation-plan.md` and the `phase*-implementation-plan.md` files document what was built, in what order, and why, per domain. `context/open-questions.md` logs genuinely unresolved ambiguities (rule 10). Manual QA history lives in `test-plan/`, `test-result/`, `test-suggestion/` (one set of three files per feature, reused as acceptance criteria rather than re-derived); a separate, more formal pre-backend spec suite lives in `test-cases/` (15 domains × Unit/Backend-API/Functional-E2E/Frontend sections, each domain increasingly carrying an explicit RBAC matrix table plus real fixed/pre-existing/still-open status annotations per case — not just narrative). `QA-TESTING-EXECUTION-PROMPT.md` (repo root) is the active full-system QA/security-audit brief driving that RBAC-matrix work; `context/qa-full-inventory.md` is its running Phase 1 inventory + live-findings log (resolver/DB/role inventory, every `@Auth()` gap already flagged, Chrome MCP live-verification results) — check it before assuming a domain's access-control has already been audited.

### `.claude/skills/` — two kinds, and they carry different authority

**Project-specific skills (authoritative — these ARE this project's conventions).**
Written from this repo's own audit findings and architecture, not vendored.
Prefer these over any generic guidance when they conflict:

| Skill | Load it when |
|---|---|
| `medibook-tenant-scoping` | Writing/reviewing any resolver, service, or Prisma query. Carries the `orgScope`/`selfScope` patterns, the five known `create*` bug instances, and the one live-exploited leak. |
| `medibook-prisma-migrations` | Touching `schema.prisma`. Hand-written-SQL workflow (`prisma migrate dev` cannot run here), naming conventions, index discipline, the restart-after-`generate` rule. |
| `medibook-graphql-contracts` | Writing/changing a resolver, entity, or DTO. The two dialects, the three mutation-response conventions, guard defaults, pagination. |
| `careos-phase-planning` | "What should we build next", mapping a PRD `FR-*` onto this codebase, checking what blocks what. |
| `medibook-responsive-mobile` | Touching any screen under `frontend/src`. The tiering model, the element-level overflow probe (the standard `scrollWidth` check provably misses real truncation here), touch/type floors, PWA gaps. |
| `medibook-design-system` | Picking a colour or font size, styling a component, branding/white-label work. Theme tokens vs. the 87 files that bypass them, and why `REQ002` branding is currently inert. |
| `medibook-frontend-data-wiring` | Building/reviewing a page that displays data, or investigating wrong/empty/stale values. The fabricated-page detection method, the no-mock-fallback rule, Apollo's `cache-first`/`errorPolicy` traps. |

**Vendored reference skills (advisory — verify against this project first).**
The rest (NestJS, React, PostgreSQL, GraphQL architecture, security review, error
handling, TypeScript, etc.) is content pulled directly from specific,
individually-vetted MIT-licensed GitHub sources — not installed through a
skill-marketplace CLI, which had no working install artifacts for anything
relevant at the time. Each file's `metadata.vetted` field records where it was
reviewed from, its license, and — importantly — where its guidance **doesn't**
match this project's conventions (e.g. the React skill's Next.js/RSC sections
don't apply to this Vite SPA; the Postgres skill's bigint-PK recommendation
conflicts with this schema's established UUID convention). Read that field before
treating a vendored skill's advice as this project's own convention.

## Current priorities (work through in order; each is a vertical slice with its own DoD)

### Priority 1 — Close the testing gap on what's already built

`backend/src` has 22 built domain modules; **all 22** (`auth`, `analytics`, `appointments`, `availability`, `blocks`, `clinicians`, `clinics`, `email-templates`, `languages`, `lookups`, `messages`, `notifications`, `organizations`, `patients`, `products`, `public`, `reviews`, `rooms`, `services`, `staff`, `test-results`, `users`) now have `.spec.ts` coverage, plus both global guards (`common/guards/*.spec.ts`) — the unit-test half of this priority's DoD is done. `frontend/e2e/` now has real-backend specs for **all 22 domains** — each one confirmed real (not mock-fallback) via live inspection before the spec was written (`context/qa-full-inventory.md` §7), not assumed; five of those (`analytics`, `public`, `services`, `staff`, `users` — see below) required finding the *right* page to target or fixing a real bug first, since the obvious route was either mock-only or broken. `admin-roles.spec.js` (pre-existing) doesn't count toward this — at the time it was written it exercised `admin/Roles.jsx` while that page was still 100% `mocks/store.js`-driven; **stale as of 2026-08-25** (`project-plans/08-integration-gap-analysis.md` §C) — `admin/Roles.jsx` now has real `useQuery`/`useMutation` calls (`GET_ROLES_DATA`/`CREATE_ROLE`/`UPDATE_ROLE`/`DELETE_ROLE`) and no live mock usage, just an unremoved historical comment; whoever wired it never updated this sentence. `public` needed two real fixes before a spec was possible (`@Public()` on `getClinicianAvailability`, `App.jsx`'s `OptionalAuthShell`) — `pages/public/landing.jsx` itself is still mock, so its specs go straight to `/doctor/:id`/`/appointments/book` with a real clinician id instead. `services` needed a full rewrite of `manager/services/index.jsx` against the real `services`/`productCategories` contract plus a real backend bug fix (`ServicesService.toGraphQL()` crashing on any service with a linked clinician; fixed both the bug and its unit test). `staff` — the last domain, closed out this session — needed `staff/{index,new,edit}.jsx` rewired off `mocks/store.js` entirely onto `backend/src/staff`'s pre-existing (never-wired) resolvers, which surfaced three real bugs in the process: (1) `StaffService.create()`/`update()` let a `phone` (globally `@unique`, for OTP login) or `update()`-time `email` collision hit Prisma directly, leaking a raw unique-constraint error — including an internal file path — to the client instead of a clean `ConflictException`, fixed with an explicit pre-check mirroring the existing email-on-create check, plus 5 new `staff.service.spec.ts` cases; (2) `admin-users.spec.js` (a different, previously-green spec) broke as a side effect — it assumed `admin@medibook.dev` would be on the users directory's default unfiltered first page, but that page is server-paginated at 8 rows/page newest-first, and the new `staff` spec's account creation was the row that finally pushed the real (accumulating, never-reset) dev-DB user count from 8 to 9, bumping the oldest seeded account off page 1 — fixed by searching for each account rather than assuming page-1 visibility, the same "don't assume a stable dataset against a real, growing backend" lesson as the `services` price-locator fix below; (3) `staff/index.jsx`'s table had no `TableContainer` wrapper (every other `Table`-based list page in the app has one), so real (wider, more numerous) data overflowed the viewport at both 360px and 1280px — not caught before because mock data happened to fit; fixed by adding the wrapper to match the established convention. `UpdateStaffInput`'s missing password-reset field and `CreateStaffInput`'s missing `status`/`since` fields were logged as open questions (`context/open-questions.md` #3) rather than guessed at, then resolved and built the same day (`REQ009`/`PLAN018`) — see Priority 2. Full e2e suite now confirmed fully green at 28/28 (run in small batches rather than one long `--workers=1` invocation, after the dev machine's host resource contention made single long runs unreliable to observe) — one other real bug found and fixed in the process: `manager-services.spec.js`'s price assertion used a page-wide `getByText('₹50.00')`, which broke once repeated real-backend test runs had accumulated more than one prior ₹50 `E2E Service *` row (the spec creates but never deletes its test service) — fixed by scoping the assertion to the specific service's `MuiCard-root`. Backend suite reconfirmed green 2026-08-22: **641 tests / 50 suites**, 129 s (the older "405/405, 37 suites" figure recorded here was stale by two sessions — verify this count against a real run rather than trusting it). Run it as `npx jest --maxWorkers=2`: a bare `npm test` at default worker count is killed by the OOM killer (exit 137) on this host before it finishes.

1. Pick one domain at a time from the e2e gap above (all 22 backend domains now have unit coverage; the remaining work here is writing/confirming each domain's Playwright spec).
2. Write unit tests per resolver/service: happy path, validation failures, tenant-isolation AND self-scoping (see Architecture) both provably rejected for cross-tenant/cross-patient/cross-clinician access, role-gating (`@Auth`/`@Public` behaving as declared) — a resolver-vs-real-source cross-check like this has found a real, previously-unfixed security bug in every domain checked closely so far, so treat "read the code while writing the matrix" as part of the test-writing step, not a separate audit.
3. Add/confirm at least one e2e test per domain's critical user path (Playwright, `frontend/`).
4. Run `npm test` (backend) and `npm run e2e` (frontend) green before moving to the next domain.
5. Commit per domain: `test(backend): add auth module tests`, etc.

**DoD:** every existing domain module has unit test coverage for happy path + tenant isolation + self-scoping + role gating (✅ done, all 22), and at least one e2e path is green against the real backend, not mocks (✅ done — all 22 domains have a real-backend e2e spec, full suite confirmed green at 28/28). Priority 1 is complete; move to Priority 2.

### Priority 2 — Build the remaining domains

**Status as of 2026-08-21** (kept current here rather than left to go stale — check `requirements/README.md` for the live picture, this is a snapshot): Finances/Billing (`REQ004`) is **done** — real Razorpay patient-payment capture plus the `finances/index.jsx` page, both tested. Settings (`REQ005`) is **done** — Profile (including Bio/DOB/Gender/structured India address/avatar upload), Password, Sessions, Deactivate, Notification-preferences storage, and real TOTP 2FA (QR enrollment, single-use backup codes) are all real and tested (`PLAN010`+`PLAN016`). Notifications (`REQ008`, closed 2026-08-21) built the trigger pipeline those preferences were missing, plus a pluggable multi-provider OTP/SMS config (MSG91/Gupshup/Twilio/AWS SNS) — this is the one deliberate per-org-configurable exception to the fixed India-vendor rule (Hard Rule 9, revised the same day). Communications/Policies (`REQ006`) has its Global Settings tab **done** — Cancellation Rules, Booking Policies, Email settings, and the SMS provider tab (rebuilt against `REQ008`'s registry, resolving `context/open-questions.md` #6) are all real and tested. The Cancellation-Policy-slider duplication (`context/open-questions.md` #7, `REQ010`) and Communications' own "Notification Templates" tab (`REQ011` — now the real `email-templates` module, same one `admin/EmailTemplates.jsx` uses) are both closed as of 2026-08-21. Admin's separate "Security settings" tab (`REQ012`, closed 2026-08-21) turned out not to duplicate `REQ005` — `REQ005` is per-user account security (a caller's own password/2FA/sessions), `REQ012` is org-wide policy an admin/manager sets for everyone in their tenant (MFA-required, idle-timeout, audit logging, patient data export, an IP whitelist) — real enforcement for all 5, not just persisted toggles, per an explicit user choice of the larger scope over persisting-only. Organization Branding (`REQ002`, closed 2026-08-21) built real logo upload, primary/secondary color pickers with server-side WCAG AA contrast validation, and propagation into `AppShell`'s sidebar/top-nav (`PLAN022`) — booking-email/invoice/favicon propagation and plan-tier gating remain out of scope, logged there rather than silently dropped, since no email pipeline/invoice module/entitlements guard exists yet. **Priority 2 is now fully complete.**

For each remaining gap: audit the frontend's existing `gql` calls for that domain first (rule 7), then follow the same build → test → integrate → verify-responsive → commit loop as Priority 1, using `context/backend-api-requirements-master-plan.md` as the acceptance spec.

**DoD per domain:** resolvers match the frontend's existing contract exactly, tests green (including tenant isolation), e2e path verified, responsive at 360/768/1280px, mock dependency removed for this domain's operations, committed.

### Priority 3 — Full mock-removal sweep

1. ✅ Done (original audit, refreshed 2026-08-22) — a fresh `grep -rl "mocks/store" src/pages src/components` no longer matches the original 12-page list verbatim; see points 2–3 for what changed. `settings/index.jsx` is fully real now — its last remaining mock scope (Branding) closed with `REQ002`/`PLAN022` (2026-08-21).
2. ✅ Done — `admin/Roles.jsx` wired (prior session). Of the 3 still-fully-mock pages with no backend at all as of this 2026-08-22 sweep (`onboarding`, `tasks`, `waiting-room`) — still Priority 2 (build the domain) candidates, not this sweep's job. **Stale as of 2026-08-25**: `onboarding` (`REQ045`, 2026-08-23) and `waiting-room` (`REQ042`) have since been wired to real backends; only `tasks` remains fully mock. See the corrected count in "What Phase F did NOT close" above.
3. ✅ Done (2026-08-22) — all 7 originally-flagged mixed-fallback pages independently re-verified, plus 2 more real bugs found that the original page-level audit missed entirely (a component with no `mocks/store` import, and a page with none at all — see below). Real bugs found and fixed:
   - `appointments/index.jsx` + `calendar/index.jsx`: `rows/events = apiRows.length > 0 ? apiRows : mockRows` fell back to fabricated data on any real *empty result*, not just a real error — live-confirmed filtering `status=no_show` (zero real matches) rendered 3 fake patients (`appointments/index.jsx`) and a month of fake calendar events (`calendar/index.jsx`). Fixed to gate on `error` only. Same fix applied to both files' clinician/clinic/room filter-dropdown fallbacks.
   - `appointments/detail.jsx`: the Reschedule dialog called `MockStore.updateAppointment()` unconditionally — a real appointment's reschedule always silently no-opped against the real backend despite a real success toast. Wired to the real, already-defined `UPDATE_APPOINTMENT_MUTATION`.
   - `clinicians/CreateClinicianPage.jsx`: `const useMock = true // always use mock in dev for now` unconditionally short-circuited every clinician creation to `MockStore.createClinician()`, leaving the real, fully-wired `createClinician` mutation right below it as dead code — every "new clinician" created through this page never existed in the real database. Fixed by deleting the dead branch.
   - `clinicians/{Create,Edit}ClinicianPage.jsx`: the "who is this locum covering for" clinician picker was a `useMockData()` hook with zero real GraphQL call in both files — always fake regardless of the org's real clinicians. Wired to the real `CLINICIANS_QUERY`.
   - `appointments/edit.jsx` and `clinician/Dashboard.jsx`: re-verified already correct (real-primary, mock only on a genuine query `error`/absent-`data` — not an empty-result check) — no fix needed.
   - Two additional real bugs found outside the original 12-page list (the original grep only matched a literal `mocks/store` import, which both of these avoided): `components/shared/NotificationBell.jsx` (the AppShell header dropdown) was a `useMockData()` hook with zero real GraphQL call at all — fake unread badge/dropdown for every logged-in user; wired to the real `notifications` domain. `pages/clinicians/detail.jsx` (the full-page `/clinicians/:id` route) was a single hardcoded `MOCK_CLINICIAN` object ("Dr. Jane Smith") with no GraphQL call whatsoever — every real clinician's detail page showed the same fake profile; rewired onto `CLINICIAN_DETAIL_QUERY` (the same query `ClinicianProfileDrawer.jsx` already used correctly elsewhere). Some mock-only fields (rating/review count/patient count/years experience/education/reviews) have no real backend counterpart at all and were dropped rather than faked — logged in `context/open-questions.md` #8.
   - Also deleted 8 confirmed-orphaned dead files with zero live importers, superseded by `layouts/AppShell.jsx`: `components/Layout/{Layout,Navbar,Sidebar,TopNav,AppBreadcrumbs,MobileBottomNav}.jsx`, `components/NotificationPanel.jsx`, `components/Appointments/AppointmentDrawer.jsx`.
   - `appointments/detail.jsx`'s own id-lookup mock fallback (`data?.appointment ?? MockStore.getAppointmentById(id)`) was checked and left as-is — confirmed harmless in practice since real UUIDs never collide with the mock store's `appt-N` ids, so it never actually triggers on real navigation.
4. Responsive re-check done for every page touched in this pass (`appointments/index.jsx`, `calendar/index.jsx`, `clinicians/detail.jsx`) at 360/768/1280px — zero horizontal overflow. Not a full-app re-sweep (last full sweep: 213/213 clean, prior session).
5. Not started — final summary commit for the sweep as a whole still pending; each fix above was committed individually per Hard Rule 4.

**DoD:** no page silently falls back to mock data for a domain with a real backend (✅ for every page/component actually touched this pass — the fully-mock pages with no backend at all remain a Priority 2 concern, not this DoD; only `tasks/index.jsx` still qualifies as of 2026-08-25, see point 2's own correction above); full test suite green end to end (backend unaffected — this pass was frontend-only; frontend e2e green for every touched spec); final commit summarizing the sweep — pending.

## Picking this up on another machine

**Last session ended 2026-08-24** having shipped four of Phase G's six
requirements in one pass: `REQ021` (prescriptions), `REQ019` (live queue
board/actions), and `REQ018`'s P0 subset (patient dedup+merge, family/
dependant profiles) — on top of `REQ017`/`REQ020`, which had already shipped
earlier the same day. See the Phase G section above for the full account of
each, including the real bugs found (a pre-existing `createAppointment`
patient_id validation gap, closed while building `REQ018`; a previously
fully-built but `useMock`-gated, hence unreachable, patient-merge UI, made
real) and two environment-level lessons worth knowing before touching this
stack again:

1. **A silent module-recompile race, hit twice.** Creating several new
   backend files in quick succession, followed immediately by edits to the
   modules that import them, can race `nest start --watch`'s debounced
   rebuild — the app restarts using a stale file snapshot, and a new
   resolver's fields silently never reach the live GraphQL schema, with
   **zero error signal anywhere**: `tsc --noEmit` is clean, `schema.gql` on
   disk is already correct, and the startup log says "Nest application
   successfully started." The only way to catch it is to introspect the
   *running* server directly (`curl .../graphql -d '{"query":"{ __type(name:
   \"Query\") { fields { name } } }"}'`) and compare against what you just
   added — not trust the generated file or a clean log. Fix: let all edits
   settle, then one clean `docker restart medibook_backend`, then
   re-introspect before writing a single test against the new fields.
2. **A second, distinct transient crash recurs independently**: `Error:
   Cannot find module './prisma/prisma.module'` on restart, seen at least
   three times across the session, unrelated to any specific change —
   self-resolves on a second clean restart every time it's been observed
   so far. If you hit it, don't debug the module path; just restart again.

Three new migrations landed this session (`20260824020000_prescriptions`,
`20260824030000_queue_management`, `20260824040000_patient_dedup_and_family`)
— `npx prisma migrate deploy` (below) picks them up in order automatically,
nothing extra needed beyond the usual steps.

`REQ032` (subscription plan engine) is the one remaining Phase G item,
**deliberately paused before starting**, not left mid-slice — see the Phase
G section above for why it's a different risk category (a global
entitlement guard touching every gated resolver) and where to begin
(`US-PLAN-01`/`02`, additive and lower-risk, before the guard itself).

Earlier history: the prior session (2026-08-23) closed Phase F, `BUG009`
(the seven fabricated pages), `BUG010` (live-browser verification of those
pages), and `BUG011` (the public booking wizard never showed real data, in
three compounding ways — see `requirements/appointments/bug/BUG011-*.md`).
To get running:

```bash
docker compose up -d                                 # dev stack
docker compose --profile test up -d postgres_test    # needed for `npm run test:int`
cd backend  && npm ci && npx prisma generate && npx prisma migrate deploy && npx prisma db seed
cd frontend && npm ci
```

**Then restore the dev fixture dump.** `prisma db seed` only creates the 5
demo accounts, roles, permissions, email templates, and the two tenant orgs —
it does **not** create the clinician/patient/appointment/availability rows
(`Sarah Mitchell`, id `8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7`; `Anita Sharma`)
that most of the e2e specs hardcode, nor today's new
`Prescriptions`/`QueueEntries`/`PatientRelations` rows the 2026-08-24 specs
created and cleaned up (the tables exist from `migrate deploy`, but their
*rows* only exist in a restored dump or a fresh e2e run). Use
**`db-dumps/medibook_db_2026-08-24.sql`** (not the 2026-08-23 one — it
predates today's 3 migrations and 60-table schema) — restore it per
`db-dumps/README.md` before trusting e2e results on a fresh machine:

```bash
MSYS_NO_PATHCONV=1 docker cp db-dumps/medibook_db_2026-08-24.sql medibook_postgres:/tmp/dump.sql
docker exec medibook_postgres psql -U medibook -d medibook_db -f /tmp/dump.sql
MSYS_NO_PATHCONV=1 docker exec medibook_postgres rm -f /tmp/dump.sql
docker restart medibook_backend
```

If you'll also run the isolated e2e-profile stack (`docker compose --profile
e2e up -d`), restore **`db-dumps/medibook_e2e_2026-08-24.sql`** into
`medibook_postgres_e2e`/`medibook_e2e` the same way — full commands in
`db-dumps/README.md`, including the one thing that bit this exact scenario
live on 2026-08-24: **a plain `docker restart` of an e2e container is not
safe** — its startup command always re-runs `seed-e2e.ts`, which is not
idempotent and will crash-loop on a unique-constraint violation against
already-seeded data. Restore the dump, then restart; don't restart expecting
it to reseed cleanly on top of what's already there. Also: each backend
container (`medibook_backend` vs. `medibook_backend_e2e`) tracks its own
migrations independently — one being current says nothing about the other;
verify with `docker exec <container> npx prisma migrate deploy` on whichever
one you're about to use, every time, not just at initial setup.

(On Windows Git Bash, prefix both `docker cp`/`docker exec` commands touching
`/tmp/...` with `MSYS_NO_PATHCONV=1` — otherwise Git Bash rewrites the
in-container path as a host Windows path before Docker ever sees it.)

**Windows without Developer Mode: `.claude/skills/*` symlinks silently don't
work.** Several project skills (`caveman`, `cavecrew`, `investigate-first`,
`lean-build`, `migration`, `safe-refactor`, `surgical-patch`,
`verify-and-stop`, ...) are committed as real symlinks into `.agents/skills/`.
Git can't create a real symlink on Windows without either Developer Mode
enabled or an elevated process — without it, checkout silently writes a
Cygwin-style `XSym` placeholder text file instead, and the skill just doesn't
load, with no error anywhere. Confirmed live 2026-08-23. Fix in order of
preference: (1) enable Developer Mode (Settings → Privacy & Security → For
Developers) once, then `git checkout -- .claude/skills/` to get real
symlinks; (2) if that's not available, replace the affected paths with NTFS
junctions instead (`New-Item -ItemType Junction`, no elevation required) —
works immediately but makes `git status` show those paths as permanently
modified/deleted on this machine specifically, so never stage
`.claude/skills/` there.

Confirmed 2026-08-23: a genuinely fresh `postgres_data` volume (new machine, or
after `docker volume rm`) has zero tables until `migrate deploy` runs, and zero
demo accounts until `db seed` runs on top of that — the seed step is easy to
forget since most sessions inherit an already-seeded volume. Skipping it doesn't
fail loudly: the demo-account login buttons submit fine and the backend throws a
raw `PrismaClientKnownRequestError` (`table public.UserProfiles does not exist`)
straight to the browser instead of a clean error. Run both `prisma migrate
deploy` and `db seed` inside the container (`docker exec medibook_backend npx
prisma ...`), not from the host — the host's `backend/.env` `DATABASE_URL` points
at `localhost:5432`, which is only correct if nothing else on the machine has
already claimed that port (see `POSTGRES_PORT`/`REDIS_PORT` in
`docker-compose.yml` if it has — override them in the gitignored root `.env`,
not `docker-compose.yml` itself, and only the container's own internal
`postgres:5432` address is guaranteed correct).

Node: **v24.19.0** (nvm, Latest LTS). The old system Node 18.13.0 was removed —
the CLAUDE.md note about `npm run e2e` needing `nvm use 20` is now obsolete on
the original machine, but has **not been re-verified** against a real Playwright
run; treat it as unconfirmed either way.

Verify green before starting (these are exactly what CI runs):

```bash
cd backend  && npm test && npm run test:int && npx eslint "{src,apps,libs,test}/**/*.ts" && npx tsc --noEmit
cd frontend && npm run lint && npm test && npm run build
node scripts/check-page-data-wiring.mjs
```

**Done since:** the six newly-wired pages have now been driven live in a
browser (`BUG010`), and the public booking wizard's own three-defect chain —
never read `?doctor=`, "Book Appointment" 404'd, day-of-week never matched —
is fixed (`BUG011`). Both closed 2026-08-23.

**What's still open**, recorded in `context/open-questions.md`:

1. **Answer open questions #10 and #11** — video captions, patient check-in, and
   the patient `status`/`condition` definitions. Each is blocking UI that was
   deliberately removed rather than faked.
2. **`BUG011`'s own residue** — `doctor-profile.jsx` and `booking/index.jsx`
   render their slot-button times in two different formats (`HH:mm` vs
   `h:mm A`); neither page has unit-level coverage for clinician-id
   resolution or day-of-week filtering, only e2e.
3. **`REQ018`'s own residue** — a dependant's self-scope was widened for
   `patients.service.ts` (profile view) and `appointments.service.ts`
   (booking) only. `prescriptions.service.ts`'s `patientPrescriptions`,
   `test-results`, and `messages` each still restrict a `'patient'` caller
   to exactly their own `patient_id`, not their dependants' too — real,
   separate, security-sensitive follow-on work per domain, not a single
   mechanical find-and-replace (get the query wrong in any one of them and
   it's a cross-patient PHI leak).
4. **`REQ032`** — not started; see the Phase G section above.

Also unproven: **the CI workflow has never executed on GitHub.** The first push
will be its first real run.

## Session resume protocol

When a session starts or resumes (including on a bare "continue"):

1. Run `git log --oneline -15` to see the last verified commits and infer which priority/domain was in progress.
2. Check `context/open-questions.md` for anything unresolved that blocks continuing (may not exist yet — that means nothing's been logged, not that the file is missing by mistake).
3. Run `docker compose up -d` and check `docker logs medibook_backend --tail 50` for a clean compile before touching code.
4. Resume at the first unmet DoD item for the in-progress priority — don't restart a domain that's already fully green.
5. State which DoD items are satisfied after each step before moving on. Only stop for genuine ambiguity (rule 10) or a failed DoD — don't ask permission between routine steps.