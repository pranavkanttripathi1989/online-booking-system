---
id: TP038
type: test-plan
feature: phase4-5-increment3
created: 2026-08-17
updated: 2026-08-17
status: approved
parent: unknown
related: [TR037, TS038, PLAN006]
---

# Phase 4/5 Increment 3 — Languages, EmailTemplates, Clinicians, Services — Test Plan

**Module:** Live frontend↔backend integration — `admin/Languages.jsx`, `admin/EmailTemplates.jsx`, `clinicians/*`, `manager/services/create.jsx`/`edit.jsx`/`detail.jsx`
**Source:** `backend/src/{languages,email-templates,clinicians,services}/**`
**Environment:** `http://localhost:3000` + `http://localhost:4000/graphql` — real Docker stack
**Updated:** 2026-08-17

---

## 1. Languages

### TC-P45-LANG-01 — Create + list round-trip
**Steps:** `createLanguage(name, code, is_active)`, then query `languages`.
**Expected:** New row appears with exact submitted values.

### TC-P45-LANG-02 — Setting a new default atomically clears the previous one
**Steps:** Create two languages, set the first as default, then set the second as default, query `languages` after each step.
**Expected:** Exactly one language has `is_default: true` at any point — never zero, never two.

### TC-P45-LANG-03 — Cannot delete the current default language
**Steps:** `deleteLanguage` on the current default.
**Expected:** Rejected with a clear message — must set another language as default first.

---

## 2. EmailTemplates

### TC-P45-EMAIL-01 — List returns the 5 seeded templates with correct `type` mapping
**Steps:** Query `emailTemplates`.
**Expected:** 5 rows, each `type` field matching the seeded `TemplateType` value exactly (e.g. `appointment_confirmation`, not the Prisma column name `template_type`).

### TC-P45-EMAIL-02 — Update with only allowed `{{variable}}` tokens succeeds
**Steps:** `updateEmailTemplate` on the Welcome template using only `{{name}}`/`{{login_url}}`.
**Expected:** `success: true`, `template.subject` reflects the change.

### TC-P45-EMAIL-03 — Update using an unknown token is rejected with a specific message
**Steps:** `updateEmailTemplate` using `{{pateint_name}}` (not in that template's `variables`).
**Expected:** `success: false`, `userErrors[0].message` names the specific unknown token(s) and lists what's allowed.

---

## 3. Services

### TC-P45-SVC-01 — Price submitted in rupees is stored in paise
**Steps:** `createService(price: 499, ...)`, then inspect the `Products` row directly in Postgres.
**Expected:** GraphQL response shows `price: 499`; the underlying DB row shows `49900`.

### TC-P45-SVC-02 — Auto-generated SKU and default product_type
**Steps:** `createService` with no `sku`/`product_type` (the form never sends them).
**Expected:** Succeeds — `Products.sku` gets a generated slug-based value, `product_type` defaults to `simple`.

### TC-P45-SVC-03 — `services` list reflects real clinics/clinician assignments
**Steps:** Query `services`, inspect `clinicians` on a service with an assigned clinician.
**Expected:** Correct clinician(s) appear via the new `ClinicianServices` join.

---

## 4. Clinicians

### TC-P45-CLIN-01 — Create with clinician_type_id resolves to the real ClinicianType
**Steps:** `createClinician(clinician_type_id: <real id>, ...)`, then query `clinician_type{id name description}`.
**Expected:** Matches the referenced `ClinicianTypeModel` row exactly.

### TC-P45-CLIN-02 — Languages (name strings) resolve via the real Languages table
**Steps:** `createClinician(languages: ["English", "Hindi"])`, query `languages`.
**Expected:** Both names round-trip; an unmatched name (no corresponding `Languages` row) is silently skipped, not an error.

### TC-P45-CLIN-03 — clinics field wraps the single clinic_id in an array
**Steps:** `createClinician(clinic_ids: [<id>])`, query `clinics{id name}`.
**Expected:** A 1-element array containing the correct clinic.

### TC-P45-CLIN-04 — services field resolves via ClinicianServices
**Steps:** `createClinician(service_ids: [<id>])`, query `services{id name duration_minutes price}`.
**Expected:** Correct service(s) with correct duration/price (rupees).

### TC-P45-CLIN-05 — Paginated list shape matches CLINICIANS_QUERY exactly
**Steps:** `clinicians(first: 5, page: 1)`.
**Expected:** `{data, paginatorInfo{count currentPage hasMorePages lastPage perPage total}}`.

### TC-P45-CLIN-06 — Live browser: `/clinicians` renders a real clinician with every relation simultaneously
**Steps:** Load `/clinicians` as an authenticated admin.
**Expected:** Real clinician card shows name, specialization (`clinician_type`), consultation fee, and assigned services all correctly — zero console errors.
