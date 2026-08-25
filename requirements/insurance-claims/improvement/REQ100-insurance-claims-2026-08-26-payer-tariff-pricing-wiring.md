---
id: REQ100
type: improvement
feature: insurance-claims
created: 2026-08-26
updated: 2026-08-26
status: in-progress
parent: —
related: []
---

# REQ100 — Wire PayerTariffs into a payer-charge estimate

## Why this slice

`REQ068` built `PayerTariffs` (payer-specific negotiated rates per product,
`(payer_id, product_id)` unique, flat `tariff_price` in paise — no
category/channel dimensions, unlike `Products` itself) but explicitly left
"where a payer tariff ranks against branch/category overrides" as an open
design question in `resolveServicePrice()`. Investigation for this slice
found the real, load-bearing reason that question was never answered:
neither of `resolveServicePrice()`'s two live charge-determining call sites
(`createRazorpayOrder` — the online Razorpay channel; `recordCounterPayment`
— tender types are `cash | upi | card | cheque`, no `insurance` tender
exists) represents "this charge is being billed to an insurer." Both are
direct-to-patient collection flows. `REQ031`'s own scope note is explicit:
"No claim/pre-auth state machine... OPD first" — that state machine, not
yet built, is the only place a payer tariff would ever supersede what the
patient is actually charged.

Wiring `PayerTariffs` into the two live charge sites today would therefore
be premature — there is no real signal at either call site for "which payer
is this being billed to," and inventing one would mean fabricating a
claims-adjacent code path ahead of the claims feature itself.

## Design decision (Hard Rule 10 — resolved, not left silent)

**Precedence, when a payer tariff is explicitly requested**: payer tariff
(if supplied) > a branch's own `skip`/`override` stance (REQ055) > patient
category > payment channel > base price. Reasoning: a payer tariff is a
contractually negotiated rate between the org and the insurer — once a
caller has deliberately decided "quote/charge this against payer X", that
number is definitive and should not be diluted by a branch's own retail
category/channel pricing rules, which govern retail (self-pay) pricing
only. Equally important: **a payer tariff must never be applied
automatically just because a patient happens to hold a policy for that
payer** — a patient can visit for a service their policy doesn't cover, or
choose to self-pay. The tariff only applies when a caller has explicitly
asked "what would this cost billed to payer X", never as an inferred
default. No existing entry in `context/open-questions.md` covers this —
this document is the first record of the decision.

## What this slice builds

A new read-only estimate, usable today with zero dependency on the not-yet-built
claims state machine:

- `resolveServicePrice()` gains a 5th, optional `payerTariffPaise` argument
  (a plain number the caller supplies, not something the function fetches
  itself — keeps the shared pricing helper free of any new Prisma
  dependency). When supplied, it takes precedence over everything else
  except a branch's `skip` stance (a branch that has withdrawn the service
  entirely still returns `null` regardless of any payer tariff).
- A new `estimatedPayerCharge(productId: ID!, payerId: ID!, patientId: ID)`
  query on the `insurance` resolver: looks up the `PayerTariffs` row for
  `(payerId, productId)`, resolves via `resolveServicePrice()` with that
  tariff passed through, and returns the amount plus whether a real tariff
  was found (vs. falling back to the base/category price when no tariff
  exists for that payer/product pair). Front-desk/admin use case: "if I
  bill this to payer X, what does the org actually recover" — a quoting
  tool, not a payment mutation.

## Given/When/Then acceptance criteria

- **Given** a `PayerTariffs` row exists for `(payer, product)`, **when**
  `estimatedPayerCharge` is queried for that pair, **then** it returns the
  tariff price (converted to rupees), not the base/category/channel price.
- **Given** no tariff row exists for that pair, **when** queried, **then**
  it falls through to the normal `resolveServicePrice()` result (base or
  category price) and flags `has_tariff: false` so the caller can tell the
  difference between "the tariff price is ₹X" and "no negotiated rate,
  showing the standard price."
- **Given** a branch has `skip`-stance on the product, **when** queried for
  that branch's clinic, **then** the result is `null` regardless of any
  payer tariff — a withdrawn service stays withdrawn.
- **Given** a cross-org product or payer, **when** queried, **then** the
  request is rejected the same way `setPayerTariff`/`findTariffs` already
  reject one today (`isSameOrg`/`orgScope`).

## Scope correction found during implementation

`PLAN140`'s own frontend section assumed "wherever the existing Payer
Tariffs admin UI lives" — investigation found no such UI exists
anywhere in `frontend/src/pages` today (`REQ068` shipped the
`PayerTariffs` backend with zero frontend surface). Building a UI
affordance for an estimate would require first building the base
tariff list/management UI it would slot into — a materially larger,
separate scope than this slice's own "wire the backend precedence
decision" goal. Shipped backend-only; the frontend tariff-management UI
(and, once it exists, an estimate action on it) is logged as a real,
separate future slice, not silently dropped.

## Deliberately out of scope

- Actually charging/billing a claim to a payer, or any claim/pre-auth
  state machine — unchanged from `REQ031`'s own P2 deferral.
- Any change to `createRazorpayOrder` or `recordCounterPayment` — neither
  gains a `payerId` argument in this slice; they remain direct-to-patient
  collection flows exactly as today.
- Inferring a payer automatically from a patient's `PatientInsurancePolicies`
  row — deliberately not built, per the design decision above.
