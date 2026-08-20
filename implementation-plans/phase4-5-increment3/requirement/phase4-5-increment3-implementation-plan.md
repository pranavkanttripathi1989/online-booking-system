---
id: PLAN006
type: plan
feature: phase4-5-increment3
created: 2026-08-17
updated: 2026-08-17
status: done
parent: unknown
related: [TP038, TR037, TS038]
---

# Phase 4/5 — Increment 3: Languages, EmailTemplates, Clinicians, Services

## Status: built, migrated, live-verified (curl + real browser)

All four modules implemented, wired into `app.module.ts`, migrated (`20260817120000_languages_emailtemplates_clinicians_services`), and verified against the running Docker stack. Full case-by-case results, one bug found and fixed, and follow-ups: `test-plan/test-result/test-suggestion` `phase4-5-increment3-*` files (below). Headline confirmations:

- **Languages**: create/update/delete work; `is_default` atomicity confirmed live (setting Hindi default correctly cleared English's).
- **EmailTemplates**: seeded 5 real templates (`prisma/seed.ts`, matching `admin/EmailTemplates.jsx`'s own mock content so the real backend now serves what the page always assumed). `{{variable}}` allowlist validation confirmed both accepting valid tokens and rejecting an unknown one with a clear message.
- **Services**: rupees-in-GraphQL / paise-in-Postgres conversion confirmed correct at the database row level (`price: 499` submitted → `49900` stored). Auto-generated SKU + default `product_type: 'simple'` confirmed working for the simpler `ServiceInput` contract.
- **Clinicians**: the most complex of the four — confirmed live in a real browser (not just curl) with `clinician_type` FK-lookup, `languages` (via `ClinicianLanguages`), `clinics` (single→array wrap), and `services` (via the new `ClinicianServices` join) all resolving correctly simultaneously on one real clinician record ("Sarah Mitchell", `/clinicians`).

**One real bug found and fixed during verification**: `EmailTemplatesService.findAll()`/`update()` returned the raw Prisma row directly, never renaming `template_type` → `type` — every list/update call threw `Cannot return null for non-nullable field EmailTemplate.type`. Fixed with a `toGraphQL()` mapper (same pattern used everywhere else this session). Caught by curl before any browser testing, so no wasted UI-debugging time.

**Operational note, now confirmed twice**: running `npm run build` (production) via `docker exec` while `nest start --watch` is also active reliably corrupts `dist/` and crashes the watch process's spawned app (`MODULE_NOT_FOUND`). Both times required a full `docker restart medibook_backend` to recover. **Going forward: don't run `npm run build` alongside the dev container — the watch process's own "Found N errors" output in `docker logs` is sufficient compile verification.**

---

Implementation plan, written before any code — per the standing "analyze, then plan, then build" convention this session has followed for every prior increment. Covers four features, picked after auditing every candidate admin/manager page's actual GraphQL contract (not guessed), per `context/backend-hard-rules.md` Rule 9.

---

## Why these four, and one deliberately excluded

Investigated candidates: `admin/Languages.jsx`, `admin/EmailTemplates.jsx`, `admin/Communications.jsx`, `admin/Policies.jsx`, `clinicians/*`, `manager/services/*`, `manager/products/*`.

- **`admin/Communications.jsx`** has zero GraphQL at all (pure mock, no contract to build against yet) — excluded.
- **`admin/Policies.jsx`** (cancellation rules) needs a `product_id` FK to attach to — entangled with the Products domain below, and adds real scope. Excluded from this increment, worth a dedicated follow-up once Products/Services core exists.
- **The Products/Services domain has three competing contracts**, not two like Rooms did: `manager/services/create.jsx`/`edit.jsx`/`detail.jsx` (canonical `graphql/queries.js`/`mutations.js` — `service`/`services`/`createService`/`updateService`, flat fields), `manager/products/create.jsx`/`edit.jsx` (`product`/`createProduct`/`updateProduct`, physical-inventory shape: `stock_quantity`, `sku`), and `manager/services/index.jsx` (`getProducts`/`getProductCategories`, richest shape: `sku`, `product_type`, `cancellation_rules{}`, `variations{}`). **Unlike Rooms, these don't collide on operation names** (they're three different mutation names), so all three could technically coexist — but building all three properly is its own multi-day increment, not "1 of 4" alongside three other full features. **This increment builds only the canonical `service`/`services` shape** (3 dedicated pages already depend on it, cleanest of the three, matches `SERVICES_QUERY` already referenced by `CreateClinicianPage.jsx`/`EditClinicianPage.jsx` too). `manager/products/*` and `manager/services/index.jsx`'s richer shape are **explicitly deferred**, not silently ignored — tracked as a follow-up the same way `rooms/index.jsx` was.

**The four:** Languages (`admin/Languages.jsx`), EmailTemplates (`admin/EmailTemplates.jsx`), Clinicians (`clinicians/index.jsx` + `Create/EditClinicianPage.jsx` + `detail.jsx`), Services (`manager/services/create.jsx`/`edit.jsx`/`detail.jsx` only).

---

## 1. Languages

**Contract** (`admin/Languages.jsx`, all real, no competing shape): `languages { id name code is_active is_default }`; `createLanguage(input: CreateLanguageInput!)`/`updateLanguage(id, input: UpdateLanguageInput!)`/`deleteLanguage(id)`, all returning `{success, userErrors}` — same wrapper pattern as the already-built Reference Data (Room/Clinician Types), so this reuses that exact convention (Rule 9 — a pattern that's now established, not novel).

**Schema:** `Languages` model already exists (`id, name, code, is_active, is_default` — need to verify exact columns match). No migration expected unless a field is missing.

**Business rule** (`TC-ADMIN-UNIT-010`/`API-014`, already written in `test-cases/12-admin-rbac`): setting a new default must atomically clear the previous default — wrap in a `$transaction` (Rule 5).

**Hard-rules checklist:** DTO validation (Rule 3) for `code` format; `@Auth('admin','super_admin')` on writes, no annotation needed on the read (global guard, Rule 2); case-insensitive duplicate `name`/`code` rejection (matches the Reference Data precedent).

---

## 2. EmailTemplates

**Contract** (`admin/EmailTemplates.jsx`): `emailTemplates { id name type subject body variables is_active }`; `updateEmailTemplate(id, input: UpdateEmailTemplateInput!)` → `{success, userErrors, template{id subject body}}`. **Read + update only** — no create/delete (templates are seeded, per `backend-implementation-plan.md` Phase 9's own note that admin editing is the intended workflow, not ad-hoc creation).

**Real contract-matching findings (Rule 9):**
- `EmailTemplates.variables` **doesn't exist in `schema.prisma` at all** — needs a new `variables String[] @default([])` column (Postgres native array; the "allowed variable names" list per template).
- `type`'s frontend values (`appointment_confirmation`, `appointment_reminder`, `appointment_cancellation`, `appointment_rescheduled`, `password_reset`, `welcome`, `invoice`, `cancellation_fee`) **don't match** the existing `TemplateType` enum (`confirmation`, `reschedule`, `cancellation`, `welcome`, `password_reset`, `otp`, `invoice_receipt`, `review_request`). Grepped the entire backend — **zero references to `TemplateType` anywhere in real code**, so nothing breaks by realigning it. Decision: replace the enum's values with the frontend's actual 8, since that's the only real consumer today; `otp`/`review_request` from the earlier planning pass aren't dropped from the roadmap, just not modeled as `TemplateType` values until something real needs them that way.
- `UpdateEmailTemplateInput` is `{subject, body}` only — the edit form never touches `type`/`variables`/`is_active`.

**Business rule** (`TC-ADMIN-UNIT-004`/`API-009`, already written): extract `{{variable}}` tokens from the submitted `subject`+`body`, reject the update if any token isn't in that template's `variables` allowlist. Real, meaningful validation — a typo'd `{{pateint_name}}` would otherwise silently render literally in a sent email.

**Hard-rules checklist:** the token-extraction+allowlist check is exactly the kind of business validation Rule 3 (DTO validation) exists for, though it needs to run in the service (it's cross-field, not single-field); `@Auth('admin','super_admin')`.

---

## 3. Clinicians

**Contract** (`clinicians/index.jsx`, `CreateClinicianPage.jsx`, `EditClinicianPage.jsx` — single consistent contract via the shared `CLINICIAN_FIELDS` fragment, no competing shape found): paginated `clinicians(clinic_id, is_active, first, page) { data{...} paginatorInfo{count currentPage hasMorePages lastPage perPage total} }`; `clinician(id)` (+ nested `availability_templates` — **out of scope**, that's Phase 5's scheduling engine, not this increment); `createClinician`/`updateClinician(input: ClinicianInput!)` returning the full fragment directly (no wrapper — matches the Clinics/Rooms/Clinicians-adjacent convention already established, not the userErrors-wrapper style).

**`clinicians/detail.jsx` is 100% mock** (`MOCK_CLINICIAN`, zero GraphQL) — wiring it to `CLINICIAN_DETAIL_QUERY` (already built for the Edit page) is in scope for this increment, since it's a one-line fix once the query resolver exists.

**Real contract-matching findings (Rule 9) — several missing columns and one shape decision:**
- Missing on `Clinicians`: `bio String?`, `avatar_url String?`, `consultation_fee Int?` (paise, per CLAUDE.md — GraphQL-exposed as rupees, converted at the resolver boundary, same pattern as Services below).
- `languages` (frontend: flat `[String]`) — `ClinicianLanguages` join table to `Languages` already exists in the schema. Resolved as a computed field (`clinicianLanguages.map(cl => cl.language.name)`), not a new flat-array column — this is exactly why Languages is being built in the same increment, not an accident.
- `clinics` (frontend: plural `[Clinic]`) — the schema models one `clinic_id` per clinician (singular). Decision: expose `clinics` as a GraphQL field wrapping the single related clinic in a 1-element array. Preserves the frontend's expected shape without inventing multi-clinic-clinician modeling that nothing else currently needs.
- `services` (frontend: plural `[Service]`, and `SERVICES_QUERY` conversely wants `clinicians{id full_name}` on each service) — **no join table exists between `Clinicians` and `Products` at all**. New `ClinicianServices` join table (`clinician_id`, `product_id`) needed — genuinely shared infrastructure between this feature and Services below, another reason to build both together.

**Hard-rules checklist:** tenant scoping (Rule 1) via the clinician's `clinic.client_org_id`, same indirect pattern as Rooms; `$transaction` (Rule 5) if create/update ever touches the `ClinicianServices`/`ClinicianLanguages` join rows alongside the clinician row itself; `@Auth('manager','admin','super_admin')` on writes (matches who manages Clinics/Rooms); read open to any authenticated role (clinicians list is used across booking flows).

---

## 4. Services (Products core — canonical shape only)

**Contract** (`manager/services/create.jsx`/`edit.jsx`/`detail.jsx`): `services(clinic_id, is_active) { id name description duration_minutes price is_active category{id name} clinicians{id full_name} }`; `service(id)`; `createService`/`updateService(input: ServiceInput!)` → same flat fields directly (no wrapper).

**Real contract-matching findings (Rule 9):**
- `ServiceInput` from the actual create form: `{name, description?, duration_minutes, price, is_active}` — no `sku`, no `product_type`, no `category_id` (the form has a `category` field in local state that's **never actually included** in the submitted mutation variables — a pre-existing frontend bug, noted but not fixed here since it's not this increment's job to redesign the form, only to match what it sends). `Products.sku` is `@unique` non-nullable and `Products.product_type` is a non-nullable enum in the schema — both need a server-generated default when the simpler `ServiceInput` doesn't supply them (auto-generated slug-based SKU, `product_type: 'simple'` default).
- **Money unit mismatch**: `Products.price` is `Int?` storing **paise** (schema comment confirms, matches CLAUDE.md). The frontend's `create.jsx` does `price: form.price ? parseFloat(form.price) : undefined` — a plain decimal rupee value (mock data like `price: 100` for "GP Consultation" confirms rupees, not paise — ₹1.00 would be absurd). Decision: GraphQL-exposed `price` stays in **rupees** (matches the frontend's real expectation, Rule 9), converted to/from paise only at the resolver boundary before touching Prisma. The `Products` table itself stays paise-denominated (matches its own schema comment and CLAUDE.md), so future GST/invoicing work isn't affected — this is a resolver-level adapter, not a schema compromise.
- `clinicians{id full_name}` on each service — same new `ClinicianServices` join table as above.

**Hard-rules checklist:** tenant scoping via `clinic_id` (nullable on `Products` — a clinic-less/org-wide product is apparently a valid state per the schema, preserved); `@Auth('manager','admin','super_admin')` on writes; the price-unit conversion gets an explicit code comment (Rule 9's spirit — the *next* engineer must not "fix" it back to raw paise without realizing the frontend expects rupees).

---

## Shared schema changes (one migration, all four features)

- `Languages`: verify existing columns match `{id, name, code, is_active, is_default}` — likely no change needed, confirm during implementation.
- `EmailTemplates`: add `variables String[] @default([])`; realign `TemplateType` enum to the 8 frontend values.
- `Clinicians`: add `bio String?`, `avatar_url String?`, `consultation_fee Int?`.
- New `ClinicianServices` join table (`clinician_id`, `product_id`, composite unique).

## Build order

Languages first (simplest, no dependents) → EmailTemplates (independent, parallel-safe) → Clinicians (depends on Languages' relation existing) → Services (depends on the `ClinicianServices` join table, built alongside Clinicians). Each gets the same live-verification treatment as Increments 1-2: `curl` first, then a real Playwright MCP browser pass, before being called done.
