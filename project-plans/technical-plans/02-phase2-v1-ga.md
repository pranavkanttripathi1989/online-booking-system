---
id: TECH003
type: technical-plan
feature: technical-plans
created: 2026-08-22
updated: 2026-08-22
status: active
parent: TECH000
related: [TECH002, TECH005, TECH006]
---

# 02 — Phase 2 / V1 GA: "Sellable to chains"

**PRD reference:** §6.2, roadmap Q3–Q4. **Requirements:** `REQ015`, `REQ022`, `REQ024`, `REQ025`, `REQ026`, `REQ027`, `REQ028`, `REQ030`, `REQ031` (P1 slice), `REQ033`, `REQ034`.
**Exit criterion (PRD §18):** 50 → 150 paying tenants; ABDM M1–M3 certified; OPD cashless live at 5 clinics; NRR baseline set.
**Prerequisite:** Phase 1 complete.

## Sequencing notes that matter more than the list order

Three items have timing constraints that aren't obvious from the dependency graph:

1. **`REQ025` (WhatsApp) should ship first, and early.** It is the single
   highest-ROI item in the whole audit (`05-competitive-analysis.md`), it has no
   dependency on anything else in this phase, and the infrastructure already
   exists — it is a new provider class in an existing registry.
2. **`REQ028` (ABDM) certification paperwork starts on day one of the phase**,
   regardless of when the build lands. Sandbox onboarding and milestone
   certification are external, gated processes with lead times engineering does
   not control. PRD risk R2 is exactly this slipping past GA.
3. **`REQ015` (RBAC enforcement) should land early, not late.** Every new role
   this phase introduces (Pharmacist, Insurance Desk Executive) is meaningless
   until permissions are actually enforced.

---

## 1. REQ025 — WhatsApp, sender identity, credit wallet

### 1.1 The provider (do this first)

`backend/src/notifications/providers/` already has a real registry with
`provider.interface.ts` and four implementations (MSG91, Gupshup, Twilio, AWS
SNS), each with per-org AES-256-GCM-encrypted credentials via
`common/crypto/secrets.ts`. Adding WhatsApp is the same shape:

```
providers/whatsapp.provider.ts    # implements the existing interface
providers/registry.ts             # register it alongside the existing four
```

Credentials are the BSP's (Business Solution Provider) — encrypted at rest with
the existing mechanism, never re-exposed to the client. Template management is
the one genuinely new concept: WhatsApp requires pre-approved message templates,
so `NotificationTemplates` needs a `whatsapp_template_id` and an approval-status
field.

Channel priority per `Appendix C`: WhatsApp → SMS → push → email.

### 1.2 Sender identity + credit wallet

```prisma
model SenderIdentities {
  id                     String  @id @default(uuid())
  client_org_id          String  @unique
  whatsapp_display_name  String?
  sms_sender_id          String?
  email_from_domain      String?
  dkim_verified          Boolean @default(false)
  spf_verified           Boolean @default(false)
}

model MessageCreditWallets {
  id                       String @id @default(uuid())
  client_org_id            String @unique
  balance_paise            Int    @default(0)
  auto_recharge_enabled    Boolean @default(false)
  auto_recharge_threshold  Int?
  auto_recharge_amount     Int?
}
```

The wallet is also the billing hook for `REQ032`'s metered services — WhatsApp at
₹0.90/conversation in the PRD's plan matrix has no mechanism to bill against
without it.

Quiet hours + frequency caps extend the existing `NotificationPreferences`.
Opt-out must be irreversible per channel until the patient re-opts-in.

**Still stubbed after this phase:** real email sending (no AWS SES credentials in
this environment — a documented, pre-existing gap). Don't claim email delivery
analytics are meaningful until that changes.

---

## 2. REQ015 — RBAC enforcement (land early)

`Permissions`/`RolePermissions` are populated tables that no authorisation path
reads. `hasPermission()` in the frontend returns constant `false` because the
auth payload never carries permissions.

### Two slices, never big-bang

**Slice A — make permissions visible.** Resolve the caller's effective permission
set at login, cache in Redis keyed by user, invalidate on role/permission change,
include in the `me`/auth payload. `hasPermission()` becomes meaningful in the UI.

**Slice B — make permissions binding.**

```ts
// common/decorators/require-permission.decorator.ts
export const RequirePermission = (...perms: string[]) => SetMetadata(PERMISSION_KEY, perms);

// common/guards/permissions.guard.ts — registered AFTER RolesGuard in app.module.ts
```

Then migrate domain by domain, adding a permission axis to the tenancy matrix as
each lands. **Ship the guard in report-only mode first** (log what it *would*
deny), review a week of logs, then enforce — a mis-scoped permission set locking
out real users mid-flight is the obvious failure mode.

Also in this requirement: break-glass access (time-boxed, reason-mandatory,
alerts Org Admin), formal impersonation grants (`FR-AUTH-06` — no impersonation
feature exists at all today), clinician registry verification, scoped API keys
(which `REQ030` depends on), and SSO (P2, defer).

---

## 3. REQ022 — Pharmacy

Depends on `REQ021` (prescriptions feed the dispense queue) and `REQ016`'s drug
master. This is one of the PRD's three named differentiators — the closed
Rx → dispense → GST invoice → stock ledger loop inside one tenant.

```prisma
model Stores {
  id         String @id @default(uuid())
  client_org_id String
  branch_id  String
  name       String
  licence_no String?
  @@index([client_org_id, branch_id])
}

model Batches {
  id            String   @id @default(uuid())
  store_id      String
  product_id    String
  batch_no      String
  expiry        DateTime
  qty           Int
  mrp_paise     Int
  purchase_rate_paise Int?
  @@index([store_id, product_id, expiry])   // FEFO lookups
  @@index([expiry])                          // near-expiry report
}

model StockLedger {
  id         String   @id @default(uuid())
  store_id   String
  product_id String
  batch_id   String?
  txn_type   String                          // dispense|purchase|return|transfer|adjustment
  qty_delta  Int
  ref_type   String?
  ref_id     String?
  recorded_at DateTime @default(now())
  @@index([store_id, product_id, recorded_at])
  @@index([ref_type, ref_id])
}

model Dispenses {
  id              String  @id @default(uuid())
  prescription_id String?                     // null for a walk-in retail sale
  store_id        String
  patient_id      String?
  invoice_id      String?
  dispensed_by    String
  created_at      DateTime @default(now())
  @@index([prescription_id])
  @@index([store_id, created_at])
}
```

Plus `PurchaseOrders`, `GoodsReceiptNotes`, `StockTransfers`.

**Design rule:** `StockLedger` is **append-only**. Never "simplify" it into a
mutated balance column during implementation — the statutory-register and audit
requirements depend on every movement being individually reconstructable. Current
stock is a sum over the ledger (materialise it if performance demands, but the
ledger stays the source of truth).

**FEFO** (first-expiry-first-out) suggestion at dispense, overridable with a
reason. **Substitution** requires a reason, visible on the invoice and to the
prescribing clinician. **Schedule H/H1** walk-in sale blocks checkout until
prescriber details are captured.

GST invoicing reuses `REQ023`'s gapless numbering implementation — per
`(store_id, financial_year)`.

---

## 4. REQ026 — Telemedicine

**Hard gate: `REQ021`'s TPG drug-list enforcement must be live before this
launches.** Not a scheduling preference — prescribing over video without List
O/A/B enforcement is a regulatory violation.

```prisma
model TelemedicineSessions {
  id                     String    @id @default(uuid())
  encounter_id           String    @unique
  join_token             String    @unique
  valid_from             DateTime
  valid_to               DateTime
  recording_consent_at   DateTime?
  recording_ref          String?
  @@index([valid_from, valid_to])
}
```

`Encounters.consultation_mode` (added in Phase 1) is what the TPG guard reads —
it must be set correctly here, not inferred.

WebRTC signalling can reuse the existing `graphql-ws`/PubSub transport for
session-state coordination rather than adding a second real-time system.
Recording (only with explicit consent) stores encrypted, India-region, following
the existing `ap-south-1` decisions — do not introduce a new storage vendor for
this feature alone.

---

## 5. REQ028 — ABDM M1–M3

Start certification paperwork immediately. Build order:

| Milestone | Capability | Notes |
|---|---|---|
| **M1** | ABHA creation/verification | Aadhaar-OTP or mobile-OTP, demographic fallback |
| **M2** | Care-context linking as HIP | FHIR R4 bundles, India profiles, per visit/Rx/report |
| **M3** | Consent-based fetch as HIU | Consent request/grant/expiry/revocation |

```prisma
model CareContexts {
  id           String   @id @default(uuid())
  patient_id   String
  abha_number  String
  encounter_id String?
  type         String                          // OPDVisit | Prescription | DiagnosticReport
  hip_id       String
  linked_at    DateTime @default(now())
  @@index([patient_id, linked_at])
  @@index([abha_number])
}
```

`Patients` gains `abha_number`, `abha_address`. `Clinics.hfr_facility_id` was
added in Phase 1.

**The `Consents` table is shared with `REQ034` (DPDP) — build one consent model,
not two.** A patient should not have to understand that "ABDM consent" and "DPDP
consent" are different systems when both answer "who can see my data, for what,
until when". Schema in `04-data-model-evolution.md` §3.4.

**Key custody** (`FR-ABDM-08`): ABDM guidance flags vendor-managed-only keys as
an anti-pattern. Design a model where the healthcare entity can hold its own keys
for ABDM-linked documents, distinct from the platform's general encryption.

**Certification transparency** (`FR-ABDM-09`): display per-milestone status with
dates in-product, matching the marketing site. Never a claim ahead of actual
certification — the PRD (§3.2) notes buyers are being coached to reject
unverified "ABDM-ready" claims.

---

## 6. REQ031 — Insurance: the P1 slice only

The PRD's M17 is 95 `FR-INS-*` requirements. **This phase builds only the P1 row
of the PRD's own scope split (§17.1)**: payer & tariff master, policy capture &
eligibility, OPD cashless / benefit-wallet adjudication, and patient
reimbursement packs.

IPD pre-authorisation, hospital claim submission/tracking/settlement, NHCX, the
desk cockpit, and government schemes are **Phase 3** — per the PRD's own Open
Question 10 recommendation ("OPD first"), because the ICP is 2–15-branch clinic
chains that mostly have no IPD at all.

```prisma
model Payers        { id String @id @default(uuid()) client_org_id String name String type String
                      irdai_no String? nhcx_participant_id String? portal_url String? contacts_json Json?
                      status String @default("active")   @@index([client_org_id, status]) }
model Empanelments  { id String @id @default(uuid()) payer_id String branch_id String empanelment_no String?
                      valid_from DateTime? valid_to DateTime? status String   @@index([payer_id, branch_id]) }
model Tariffs       { id String @id @default(uuid()) payer_id String branch_id String? item_type String item_id String
                      rate_paise Int? discount_pct Int? effective_from DateTime effective_to DateTime?
                      @@index([payer_id, item_type, item_id, effective_from]) }
model PatientPolicies { id String @id @default(uuid()) patient_id String payer_id String policy_no String
                        member_id String? corporate_id String? sum_insured_paise Int?
                        valid_from DateTime? valid_to DateTime? priority Int @default(1)
                        verified_at DateTime? verified_by String?
                        @@index([patient_id, priority]) @@index([payer_id]) }
model BenefitWallets  { id String @id @default(uuid()) patient_policy_id String category String
                        limit_paise Int consumed_paise Int @default(0)
                        period_start DateTime period_end DateTime
                        @@index([patient_policy_id, category, period_end]) }
```

**The adjudication is the differentiator and must be fast.** PRD's own worked
example is the acceptance test: a patient with ₹2,000 wallet remaining and 20%
co-pay, billed ₹800 ⇒ ₹640 payer-payable, ₹160 patient-payable, wallet drops to
₹1,360, receptionist calculates nothing, split shown before payment.

**Build on `REQ023`'s bill-splitting mechanism** — benefit-wallet logic is one
more *source* of a split, not a second parallel billing engine.

**Design for no API existing.** PRD risk R11: most insurers/TPAs still work
through bespoke portals and email. Manual "verified by" eligibility (with
reference number, screenshot, timestamp) and portal-assist submission are
**first-class paths**, not degraded fallbacks.

`FR-INS-95`: sharing any record with a payer requires recorded patient
authorisation — depends on `REQ034`'s consent model and `REQ015`'s permissions.

---

## 7. REQ030 — Public API and webhooks

Depends on `REQ015`'s API keys. Net-new: the current surface is internal GraphQL
only.

- Versioned REST `/v1` with a published OpenAPI spec, sandbox keys, rate limits, **idempotency keys on writes**.
- Webhooks: signed payloads, exponential-backoff retry, `WebhookSubscriptions` + `WebhookDeliveryLog`.
- Second payment gateway as Razorpay failover (`FR-INT-03`) — generalise the current Razorpay-specific service behind a provider interface.

**Every new external endpoint goes through the same fail-closed guard chain and
tenant-scoping discipline as the internal API.** A separately-implemented,
weaker auth path on the public surface would undo Phase F entirely.

---

## 8. REQ033 — Tenant subscription collection (e-mandate)

Distinct from Flow A (patient→provider, already real via Razorpay). This is Flow
B: tenant→platform, governed by RBI's 2026 e-mandate framework.

Hard regulatory rules, each a testable acceptance criterion:

- One-time mandate registration with AFA; subsequent debits **≤ ₹15,000** need no per-cycle OTP.
- **Pre-debit notice ≥24 hours before every debit**, stating amount/date/merchant, with opt-out.
- Post-debit confirmation after every collection.
- View/modify/pause/revoke/cancel at any time (AFA-authenticated).
- **Zero fee to the tenant for using e-mandate** — verify as a named test case.
- Invoices > ₹15,000 auto-fall back to split collection, payment link with AFA, or eNACH — disclosed, never silent.

`PaymentMandates` + `PreDebitNotifications` (the 24-hour-notice audit trail).
Failed debits feed `REQ032`'s dunning state machine.

---

## 9. REQ024 / REQ027 / REQ034 — supporting

- **`REQ024` messaging**: extends the real `messages` module (threads, participants, `messageReceived` subscription all exist). Adds thread typing, SLA-timed shared inbox, canned replies, attachments, clinical-safety guardrails, and linkage of clinical messages into the patient timeline.
- **`REQ027` patient portal**: the *wiring* of the two fabricated pages (`patient/Appointments.jsx`, `patient/Profile.jsx`) belongs to Phase F/`project-plans` P2, not here. This requirement adds family profiles, ABHA management UI, installable PWA (<300 KB initial payload per PRD NFR), refill requests, and i18n — **no i18n framework exists in the frontend today**, so that's a real new dependency decision.
- **`REQ034` DPDP**: run *throughout* the phase, not as a discrete step at the end. Retrofitting consent capture onto accumulated data is far more expensive than building it in. Shares the `Consents` table with `REQ028`.

---

## Phase 2 Definition of DoD

- WhatsApp is a working notification channel with per-org sender identity and a billable credit wallet.
- Revoking a permission in the matrix demonstrably prevents the operation (tested per migrated domain).
- A signed prescription flows to the pharmacy dispense queue, decrements batch stock FEFO, and produces a GST-compliant invoice — tested as an integration test spanning both modules.
- ABDM M1–M3 certified (external gate), with status displayed in-product.
- OPD cashless adjudication produces the PRD's worked-example split with no manual calculation.
- Tenant subscriptions collect via UPI AutoPay with compliant 24-hour pre-debit notices.
- Public API v1 published with OpenAPI, behind the same guard chain as internal.
