---
id: PP005
type: analysis
feature: project-plans
created: 2026-08-22
updated: 2026-08-22
status: active
parent: PP000
related: [PP000, PP006]
---

# 05 — Competitive analysis and product recommendations

## 0. How to read this

The repository already contains a competitive gap analysis
(`REQ003`, benchmarked against **Semble**, a UK practice-management platform).
That was a good exercise and its headline conclusion is still correct: *MediBook
is booking and scheduling; the competition is practice management.*

But the benchmark is aimed at the wrong market. `CLAUDE.md` states the product is
built for **India** — Razorpay, MSG91/Gupshup, AWS `ap-south-1`, GST, paise,
PIN-code addresses. The competitive set for an Indian clinic-software buyer is
not Semble; it is Practo, Eka Care, Bajaj Finserv Health, HealthPlix and the
long tail of Indian clinic-management vendors, with Cliniko/Jane/SimplePractice
as the reference for SMB product quality and Zocdoc/NexHealth/Phreesia as the
reference for the access-and-intake layer.

Competitor capabilities below reflect how these products are generally
positioned in the market. Before any of it drives a roadmap commitment, confirm
current feature sets and pricing directly — vendor scope moves quickly, and I
have not verified them against live sources in this session.

## 1. Where MediBook actually stands

Honest scoring of what exists in the code today, not what is documented as
planned.

| Capability | MediBook today | Market expectation |
|---|---|---|
| Multi-tenant SaaS scaffolding | **Strong** — org model, per-org settings, branding, plan/subscription tables, onboarding wizard (mock-backed) | Table stakes |
| Appointment booking & calendar | **Strong** — availability templates, lunch breaks, spacer/room blocks, slot generation, FullCalendar UI, real-time subscriptions | Table stakes |
| Patient records | **Basic** — demographics, free-text notes | Table stakes; competitors carry structured clinical records |
| Clinical layer (consult notes, diagnoses, prescriptions, labs) | **Absent** | Table stakes for Practo Ray, Semble, Jane, DrChrono |
| Payments | **Real** — Razorpay order + signature verification | Table stakes; but no webhook, no GST invoice |
| Patient communication | **SMS via pluggable provider (real), email stubbed** | India expects **WhatsApp first** |
| Teleconsultation | **Route exists, no real implementation** | Table stakes post-2020 in India |
| Reviews / reputation | **Read + moderate only — no submission path exists** | Practo's actual moat |
| Interoperability (ABDM/ABHA, UHI, FHIR) | **Absent** | Fast becoming table stakes in India |
| RBAC / access groups | **Stored, not enforced** (`F-03`) | Table stakes for multi-site clinics |
| Insurance / TPA / cashless | **Absent** | Expected by mid-market Indian clinics |
| Intake forms, kiosk check-in, patient journey | **Mock-only pages** (`waiting-room`, `tasks`) | Phreesia/NexHealth differentiator |
| No-show reduction (waitlist, deposits) | **Cancellation rules only** | Zocdoc/Luma differentiator, and a direct revenue lever |
| Analytics | **Real but proxy metrics** — utilisation is a completion-rate proxy, documented as such | Competitors report true chair/slot utilisation |
| Compliance (DPDP, audit, retention) | **Partial** — settings persisted, audit shallow (`F-10`) | Required for any legal review |
| Plan entitlement enforcement | **Absent** (documented as not built) | Required to monetise tiers |

The pattern: **the hard, unglamorous scheduling engine is the strongest part of
this codebase**, and it is genuinely competitive. Everything that turns a
scheduler into a practice-management platform, or into an Indian-market product
specifically, is missing.

## 2. The competitive frames that matter

### 2.1 Practo (India, direct competitor)
Two-sided: a consumer marketplace that generates demand, plus **Ray**, the
clinic-side practice-management product. The marketplace is the moat — clinics
buy Ray partly to receive bookings. A pure SaaS scheduler competing on features
alone is competing against a product that also brings patients.

**Implication for MediBook:** do not try to out-feature Ray. Either (a) plug into
demand aggregation via **UHI** rather than building a marketplace, or (b)
position explicitly as the white-label system of record for clinic chains that
do *not* want to rent their patient relationship from a marketplace. Option (b)
is consistent with the branding and multi-tenancy work already built, and it is
a real, defensible position — but it only works if white-labelling is
complete (`F-19`) and RBAC actually works (`F-03`).

### 2.2 Eka Care / Bajaj Finserv Health (India, ABDM-native)
Positioned around ABDM/ABHA integration — ABHA-linked records, consent-based
data exchange, government-registry participation. This is where Indian digital
health is being standardised.

**Implication:** ABDM support is moving from differentiator to entry
requirement, particularly for any clinic touching government schemes or
insurance. MediBook has none. This is the single largest strategic gap.

### 2.3 Semble / Cliniko / Jane / SimplePractice (SMB practice management)
The product-quality reference. What they have that MediBook does not: clinical
notes with templates, prescriptions, letters and documents, integrated
telehealth, patient portal with intake forms, and clean recurring/series
booking. The repo's own `REQ003` already names this gap.

**Implication:** the clinical layer is the difference between "booking tool" and
"system of record", and systems of record do not churn. `patients/detail.jsx`
already has the UI shell for documents, diagnoses, and letters — driven entirely
by `useState([])` (`F-18`). The interface for the moat is drawn; nothing is
behind it.

### 2.4 Zocdoc / NexHealth / Phreesia / Luma (the access layer)
Their entire value proposition is reducing friction and no-shows: waitlist
auto-fill, deposits, smart multi-channel reminders, digital intake before
arrival, kiosk check-in.

**Implication:** these are the cheapest ROI features available to MediBook,
because they attach directly to the scheduling engine that is already strong.
A clinic can measure "no-shows fell 30%" in a month. It cannot measure "the RBAC
matrix is now enforced" — even though the latter matters more.

## 3. Recommendations, ranked

Ranked by (customer-visible impact × India fit) ÷ effort. Prerequisite for all
of it: the P0 work in `06-execution-plan.md`. Shipping features on top of a live
cross-tenant read and a client-side auth bypass increases exposure rather than
value.

### Tier 1 — high impact, low effort, distinctly Indian (next quarter)

1. **WhatsApp Business API as a first-class notification channel.**
   In India, WhatsApp is *the* patient-communication channel; SMS is the
   fallback and email is close to noise. The infrastructure for this already
   exists — `NotificationTriggerService` reads per-event preferences, and
   `notifications/providers/registry.ts` is a real pluggable provider registry
   with per-org encrypted credentials. Adding a WhatsApp provider is the same
   shape as the existing MSG91/Gupshup/Twilio providers, plus template
   management. **This is the highest-ROI item in this document**: days of work
   against a channel every Indian competitor already has.

2. **Appointment-reminder scheduler.** Already identified as unwired
   (`appointment_reminder` needs a scheduler, not an event hook). BullMQ is
   already a stated dependency and Redis is already provisioned. Reminders are
   the mechanism by which the WhatsApp channel actually reduces no-shows.

3. **Deposits / prepay at booking.** Razorpay is already integrated. Making
   payment a booking precondition (configurable per service) is the most direct
   no-show lever that exists, and it converts a cost centre into cash flow.
   Pairs with the existing cancellation-rules engine for refund policy.

4. **Waitlist with auto-fill.** When a booking cancels, offer the slot to the
   waitlist by WhatsApp, first to confirm takes it. Recovers revenue that is
   currently simply lost. The slot-availability engine needed for this already
   exists (`availableSlots`).

5. **Review submission and request loop.** `ReviewsService` today can read and
   moderate reviews but has **no creation path at all** — the flywheel is
   missing its first step. Post-visit review request over WhatsApp, plus a
   submission mutation, plus surfacing ratings on the public doctor profile.
   This is Practo's moat mechanic, available cheaply because the read side and
   the public profile page already exist.

6. **GST-compliant patient invoices** (`F-17`). A statutory requirement for
   registered providers, currently impossible because the GST fields live only
   on the SaaS-billing table. Plus the missing **Razorpay webhook** so payments
   reconcile instead of sitting `pending`.

### Tier 2 — the moat (2–3 quarters)

7. **Clinical layer MVP: consultation notes + e-prescription.**
   Templated SOAP notes, a diagnosis field (ICD-10 or a curated subset),
   structured prescriptions with a drug master, and a printable/shareable Rx
   that meets NMC telemedicine-practice expectations. This is what converts
   MediBook from a scheduler into a system of record. `patients/detail.jsx`
   already has the shell.

8. **ABDM / ABHA integration.** ABHA-number linking on the patient record,
   registration as a Health Information Provider, participation in the consent
   framework, and HPR/HFR registry entries for clinicians and facilities. Long
   lead time (certification, sandbox, security review), which is exactly why it
   should start early. Treat it as a compliance programme, not a feature.

9. **Real teleconsultation.** `pages/video/index.jsx` exists as a route with no
   implementation. Choose a provider (or WebRTC + a TURN service in
   `ap-south-1`), add consent capture and session records to satisfy
   telemedicine guidelines, and link the session to the appointment.

10. **Make RBAC real** (`F-03`). Not a growth feature, but it is a hard
    procurement requirement for any multi-site clinic chain — which is exactly
    the segment the multi-tenancy and branding work targets. Selling
    "granular access control" that does not restrict anything is a
    reputational risk, not just a technical debt.

### Tier 3 — competitive parity (3–4 quarters)

11. **Digital intake and patient journey.** Turn `waiting-room` and `tasks` from
    mock pages into real domains: pre-visit forms sent by WhatsApp, kiosk or
    QR check-in, journey states (arrived → in consult → done → billed). This is
    the Phreesia/NexHealth play and it makes front-desk time visibly cheaper.

12. **Insurance / TPA and cashless workflows.** Pre-authorisation tracking,
    claim status, package pricing. Necessary for mid-market Indian clinics;
    substantial work.

13. **Analytics worth acting on.** Replace the documented completion-rate proxy
    for utilisation with true slot-capacity utilisation (walk
    `ClinicianAvailability` minus blocks) — the honest metric a practice manager
    actually needs. Add no-show rate by clinician and service, revenue per
    available hour, and new-versus-returning patient mix.

14. **Multilingual UI.** Hindi plus two or three regional languages. The
    `Languages` table exists for clinician-spoken languages, not for UI
    localisation — there is no i18n framework in the frontend at all. Real
    reach constraint outside metro English-speaking segments.

### Tier 4 — platform maturity (continuous)

15. **Plan entitlement enforcement.** `SubscriptionPlans` and
    `OrganizationSubscriptions` exist; nothing enforces tier limits. Tiered
    pricing is unmonetisable without it.
16. **Observability and SLOs.** No metrics, tracing, or error tracking anywhere.
    A healthcare booking system needs to be able to answer "was it down" with
    data.
17. **DPDP Act 2023 programme.** Consent artefacts, purpose limitation,
    automated retention and erasure, breach notification, processor register,
    data-residency assertion. Required before a paying clinic's legal review.
18. **Complete white-labelling** (`F-19`). 88 of 122 UI files hardcode colours,
    so branding stops at the sidebar. For a product positioned on white-label
    multi-tenancy, this is a product gap.

## 4. The strategic summary

Three sentences:

1. **The scheduling engine is genuinely competitive** — availability templates,
   blocks, slot generation, real-time updates, multi-tenant from the ground up.
   That is the hard part and it is largely done.
2. **The product is one layer short of being a system of record** — no clinical
   notes, no prescriptions, no interoperability — which caps it at "tool the
   clinic could replace" rather than "system the clinic is built on".
3. **The India-specific gaps are the cheap ones.** WhatsApp, reminders, deposits,
   waitlist, review requests, GST invoices — all attach to infrastructure that
   already exists, all are visible to the buyer within a month, and none of them
   are architecturally hard. Do those while the clinical and ABDM work runs on
   a longer clock.

And the precondition: fix the five items in `P0`. A cross-tenant read
(`F-01`), a client-side auth bypass (`F-02`), an unindexed database (`F-13`),
fourteen pages of fabricated data (`F-18`), and no CI (`F-26`) are not
compatible with selling to clinics, regardless of how good the feature list gets.
