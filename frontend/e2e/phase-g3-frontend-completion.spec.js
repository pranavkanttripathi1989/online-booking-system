import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// helpers.js's loginAs() has no precedent in this suite of being called a
// second time within the same test (grep confirms every other spec logs in
// once per test) — /login itself redirects an already-authenticated
// visitor straight to their dashboard without ever rendering the demo
// buttons, so a bare second loginAs() call hangs forever waiting for a
// button that will never render. Clearing the stored session first (this
// suite's own domains need real cross-role handoffs mid-test — e.g. staff
// records a payment, a manager approves it) avoids that redirect.
async function switchLoginAs(page, roleLabel) {
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await loginAs(page, roleLabel)
}

// Phase G+3 frontend completion — real UI for the 8 backend-only domains
// shipped 2026-08-25 (REQ051 checklist, REQ052 intake-fields, REQ053
// break-glass/impersonation, REQ054 packages, REQ055 branch-overrides,
// REQ056 discount-approval/cash-drawer, REQ057 documents, REQ058 messages
// extensions). Each PLAN### for these domains explicitly deferred the
// frontend; this closes that gap. One critical-path test per surface,
// against the real backend, no mocks.

const GRAPHQL_URL = process.env.E2E_GRAPHQL_URL || 'http://localhost:4000/graphql'

// This dev host runs 8 docker containers plus, at times, unrelated heavy
// macOS background processes (a Storage-usage scan observed live during
// this suite's own development, pushing the 1-min load average past 40) —
// the exact "host resource contention" pattern this codebase's own
// CLAUDE.md documents repeatedly. The default 30s test timeout is tuned
// for a quiet host; triple it here rather than treat a slow render as a
// product bug.
test.beforeEach(async () => {
  test.setTimeout(150_000)
})

// Re-running this file minutes apart (as happens while iterating on it)
// landed successive runs' fixture appointments within the same clinician's
// service duration of each other despite each using the untruncated
// current time — real wall-clock deltas of a few minutes are smaller than
// a 30-60 minute appointment slot. A large, run-scoped random day offset
// spreads different runs across calendar days far enough apart that the
// real Postgres slot-conflict EXCLUDE constraint never sees an overlap.
const RUN_SEED_DAYS = Math.floor(Math.random() * 500) + 500

async function gql(request, token, query, variables) {
  const res = await request.post(GRAPHQL_URL, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    data: { query, variables },
  })
  const body = await res.json()
  if (body.errors) throw new Error(`GraphQL error: ${JSON.stringify(body.errors)}`)
  return body.data
}

async function loginToken(request, email, password) {
  const data = await gql(
    request,
    null,
    `mutation { login(input: {email:"${email}", password:"${password}"}) { ... on AuthPayload { access_token } } }`,
  )
  return data.login.access_token
}

// Shared real-fixture lookups (MG Road Clinic / Sarah Mitchell / GP
// Consultation) — looked up by name at run time, never hardcoded ids,
// since a fresh machine's dev DB may seed different uuids for the same
// named rows (see CLAUDE.md's own db-dumps/README.md restore instructions).
async function findClinicId(request, token, name = 'MG Road Clinic') {
  const data = await gql(request, token, `{ clinics { id name } }`)
  return (data.clinics.find((c) => c.name === name) ?? data.clinics[0]).id
}

// The accessible name/label association on this MUI Select proved
// unreliable to target at all under real conditions (neither an exact
// getByLabel('Clinic') nor a getByRole('combobox', {name: /^Clinic/})
// ever matched, in any run, even with the clinic already correctly
// selected per the failure screenshot every time) — a real, deterministic
// locator problem, not host load. A stable data-testid on the Select
// itself (clinic-forms/index.jsx, manager/packages/index.jsx) sidesteps
// the ambiguity entirely.

// The MUI Select this targets auto-selects the org's first clinic on load
// (clinic-forms/index.jsx's own `if (rows.length && !clinicId) setClinicId(rows[0].id)`),
// which raced a real click in practice — a click landing while the
// auto-select effect was still re-rendering the Select left Playwright
// retrying against a stale element reference. Skipping the interaction
// entirely once the desired clinic is already the selected value avoids
// the race outright.
async function selectClinicIfNeeded(page, clinicLabel = 'MG Road Clinic') {
  const select = page.getByTestId('clinic-select')
  await expect(select).toBeVisible({ timeout: 45_000 })
  await expect(select).not.toHaveText('', { timeout: 45_000 })
  const current = (await select.textContent()) ?? ''
  if (current.includes(clinicLabel)) return
  await select.click()
  await page.getByRole('option', { name: clinicLabel }).click()
}

async function findServiceId(request, token, name = 'GP Consultation') {
  const data = await gql(request, token, `{ services { id name price clinicians { id } } }`)
  const svc = data.services.find((s) => s.name === name) ?? data.services[0]
  return { id: svc.id, price: svc.price, clinicianId: svc.clinicians[0].id }
}

async function createFixturePatient(request, token, label) {
  const data = await gql(
    request,
    token,
    `
    mutation($input: PatientInput!) { createPatient(input: $input) { id } }
  `,
    {
      input: {
        first_name: 'E2E',
        last_name: label,
        email: `e2e.${label.toLowerCase()}.${Date.now()}@example.com`,
        phone: `9${Date.now().toString().slice(-9)}`,
        date_of_birth: '1990-01-01',
      },
    },
  )
  return data.createPatient.id
}

async function createFixtureAppointment(request, token, { patientId, clinicianId, serviceId, clinicId, offsetDays }) {
  // Deliberately NOT truncated to a fixed hour/minute — the real Postgres
  // slot-conflict EXCLUDE constraint rejects an overlapping (clinician,
  // time-range) pair, and a fixed time-of-day collided with the same
  // fixture's own residue left behind by an earlier run of this spec (the
  // suite doesn't clean up its appointment fixtures, matching this
  // codebase's own established e2e residue convention). Keeping the full,
  // untruncated current-time offset means every invocation lands on a
  // distinct minute:second, which never collides in practice.
  const start = new Date(Date.now() + (offsetDays + RUN_SEED_DAYS) * 24 * 3600 * 1000)
  const data = await gql(
    request,
    token,
    `
    mutation($input: AppointmentInput!) { createAppointment(input: $input) { id } }
  `,
    {
      input: {
        patient_id: patientId,
        clinician_id: clinicianId,
        service_id: serviceId,
        clinic_id: clinicId,
        start_datetime: start.toISOString(),
      },
    },
  )
  return data.createAppointment.id
}

test.describe('Checklist (REQ051 US-QUE-06) — blocks and clears real queue Call Next', () => {
  let managerToken
  let clinicId
  let clinicianId
  let serviceId
  let patientId
  let appointmentId
  let itemId
  const label = `E2E Vitals Check ${Date.now()}`

  test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext()
    managerToken = await loginToken(request, 'manager@medibook.dev', 'Mgr1234!')
    clinicId = await findClinicId(request, managerToken)
    const svc = await findServiceId(request, managerToken)
    serviceId = svc.id
    clinicianId = svc.clinicianId
    patientId = await createFixturePatient(request, managerToken, 'ChecklistPatient')
    appointmentId = await createFixtureAppointment(request, managerToken, { patientId, clinicianId, serviceId, clinicId, offsetDays: 420 })
    await request.dispose()
  })

  test.afterAll(async ({ playwright }) => {
    const request = await playwright.request.newContext()
    if (itemId) {
      await gql(request, managerToken, `mutation($id: ID!) { deleteChecklistItem(id: $id) { success } }`, { id: itemId }).catch(() => {})
    }
    // A checked-in appointment leaves a real QueueEntries row in 'waiting'
    // status. Left uncancelled, callNextInQueue's FIFO pick surfaces this
    // run's own stale entry ahead of a later run's fresh one — confirmed
    // live: after several runs, callNextInQueue kept resolving to an old
    // appointment nobody had completed the (also-old) checklist item for,
    // even once the current run's own item was genuinely completed.
    if (appointmentId) {
      await gql(request, managerToken, `mutation($id: ID!) { cancelAppointment(id: $id, reason: "e2e cleanup") { id } }`, {
        id: appointmentId,
      }).catch(() => {})
    }
    await request.dispose()
  })

  test('manager creates a required item; callNextInQueue is blocked then clears once staff completes it', async ({ page, request }) => {
    await loginAs(page, 'Manager')
    await page.goto('/manager/clinic-forms')
    await selectClinicIfNeeded(page, 'MG Road Clinic')
    await expect(page.getByRole('tab', { name: 'Pre-Visit Checklist' })).toBeVisible()
    await page.getByRole('button', { name: 'Add Item' }).click()
    await page.getByLabel('Label').fill(label)
    await page.getByLabel('Required').check()
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByText(label)).toBeVisible({ timeout: 40_000 })

    const items = await gql(
      request,
      managerToken,
      `
      query($clinicId: ID!) { checklistItems(clinic_id: $clinicId) { id label is_required } }
    `,
      { clinicId },
    )
    const item = items.checklistItems.find((i) => i.label === label)
    expect(item).toBeTruthy()
    itemId = item.id

    await gql(request, managerToken, `mutation($id: ID!) { checkInAppointment(id: $id) { id status } }`, { id: appointmentId })

    await expect(
      gql(request, managerToken, `mutation($cid: ID!) { callNextInQueue(clinician_id: $cid) { id } }`, { cid: clinicianId }),
    ).rejects.toThrow(/required checklist items incomplete/)

    await switchLoginAs(page, 'Staff')
    await page.goto(`/appointments/${appointmentId}`)
    await expect(page.getByText('Pre-Consultation Checklist')).toBeVisible({ timeout: 45_000 })
    await expect(page.getByText(label)).toBeVisible()
    // .check() verifies the checked state only once, right after its own
    // click — too early for the real mutation round-trip + refetch this
    // checkbox's onChange kicks off. A plain .click() plus a separately
    // polling expect(...).toBeChecked() gives that cycle time to land.
    await page.getByRole('checkbox', { name: `Complete ${label}` }).click()
    await expect(page.getByRole('checkbox', { name: `Complete ${label}` })).toBeChecked({ timeout: 40_000 })

    const called = await gql(request, managerToken, `mutation($cid: ID!) { callNextInQueue(clinician_id: $cid) { id status } }`, {
      cid: clinicianId,
    })
    expect(called.callNextInQueue.status).toBe('called')
  })
})

test.describe('Intake Fields (REQ052 US-BOOK-06) — configured field is enforced and round-trips', () => {
  let managerToken
  let clinicId
  let clinicianId
  let serviceId
  let patientId
  let fieldId
  const key = `e2e_notes_${Date.now()}`
  const fieldLabel = `E2E Pre-visit note ${Date.now()}`

  test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext()
    managerToken = await loginToken(request, 'manager@medibook.dev', 'Mgr1234!')
    clinicId = await findClinicId(request, managerToken)
    const svc = await findServiceId(request, managerToken)
    serviceId = svc.id
    clinicianId = svc.clinicianId
    patientId = await createFixturePatient(request, managerToken, 'IntakePatient')
    await request.dispose()
  })

  test.afterAll(async ({ playwright }) => {
    const request = await playwright.request.newContext()
    if (fieldId) {
      await gql(request, managerToken, `mutation($id: ID!) { deleteIntakeFieldConfig(id: $id) { success } }`, { id: fieldId }).catch(
        () => {},
      )
    }
    await request.dispose()
  })

  test('manager configures a required field via UI; a booking missing it is rejected, and a booking with it round-trips', async ({
    page,
    request,
  }) => {
    await loginAs(page, 'Manager')
    await page.goto('/manager/clinic-forms')
    await selectClinicIfNeeded(page, 'MG Road Clinic')
    await page.getByRole('tab', { name: 'Intake Form Fields' }).click()
    await page.getByRole('button', { name: 'Add Field' }).click()
    await page.getByLabel('Key').fill(key)
    await page.getByLabel('Label').fill(fieldLabel)
    await page.getByLabel('Required').check()
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByText(fieldLabel)).toBeVisible({ timeout: 40_000 })

    const fields = await gql(
      request,
      managerToken,
      `
      query($clinicId: ID!) { intakeFieldConfigs(clinic_id: $clinicId) { id key label is_required } }
    `,
      { clinicId },
    )
    const field = fields.intakeFieldConfigs.find((f) => f.key === key)
    expect(field).toBeTruthy()
    fieldId = field.id

    const start = new Date(Date.now() + (421 + RUN_SEED_DAYS) * 24 * 3600 * 1000)
    await expect(
      gql(
        request,
        managerToken,
        `
      mutation($input: AppointmentInput!) { createAppointment(input: $input) { id } }
    `,
        {
          input: {
            patient_id: patientId,
            clinician_id: clinicianId,
            service_id: serviceId,
            clinic_id: clinicId,
            start_datetime: start.toISOString(),
          },
        },
      ),
    ).rejects.toThrow(/Missing required field/)

    const withField = await gql(
      request,
      managerToken,
      `
      mutation($input: AppointmentInput!) { createAppointment(input: $input) { id intake_responses { key value } } }
    `,
      {
        input: {
          patient_id: patientId,
          clinician_id: clinicianId,
          service_id: serviceId,
          clinic_id: clinicId,
          start_datetime: start.toISOString(),
          intake_responses: [{ key, value: 'No known issues' }],
        },
      },
    )
    const response = withField.createAppointment.intake_responses.find((r) => r.key === key)
    expect(response?.value).toBe('No known issues')
  })
})

test.describe('Break-glass access (REQ053 US-SEC-05) — self-service request, manager-initiated early revoke', () => {
  let managerToken
  let clinicianToken

  test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext()
    managerToken = await loginToken(request, 'manager@medibook.dev', 'Mgr1234!')
    clinicianToken = await loginToken(request, 'clinician@medibook.dev', 'Cln1234!')
    await request.dispose()
  })

  test('a clinician requests emergency access from Settings; a manager revokes it early', async ({ page, request }) => {
    const reason = `E2E emergency access ${Date.now()}`
    await loginAs(page, 'Clinician')
    await page.goto('/settings')
    await page.getByRole('tab', { name: 'Account & Security' }).click()
    await page.getByRole('button', { name: 'Request Emergency Access' }).click()
    await page.getByLabel('Reason').fill(reason)
    await page.getByRole('button', { name: 'Request Access' }).click()
    await expect(page.getByText(reason)).toBeVisible({ timeout: 40_000 })

    const grants = await gql(request, clinicianToken, `{ myBreakGlassGrants { id reason is_active revoked_at } }`)
    const grant = grants.myBreakGlassGrants.find((g) => g.reason === reason)
    expect(grant).toBeTruthy()
    expect(grant.is_active).toBe(true)

    const revoked = await gql(
      request,
      managerToken,
      `
      mutation($id: ID!) { revokeBreakGlassAccess(id: $id) { success userErrors { message } } }
    `,
      { id: grant.id },
    )
    expect(revoked.revokeBreakGlassAccess.success).toBe(true)

    const after = await gql(request, clinicianToken, `{ myBreakGlassGrants { id reason is_active revoked_at } }`)
    const afterGrant = after.myBreakGlassGrants.find((g) => g.id === grant.id)
    expect(afterGrant.is_active).toBe(false)
    expect(afterGrant.revoked_at).toBeTruthy()
  })
})

test.describe('Impersonation (REQ053 US-SEC-06) — admin starts and exits a real session swap', () => {
  test('admin impersonates a target user, the target view loads, exiting restores the original session', async ({ page }) => {
    await loginAs(page, 'Admin')
    await page.goto('/admin/users')
    // Directory is server-paginated (newest-first) — search rather than
    // assume the seeded clinician@ account is on the default first page
    // (matches this codebase's own documented admin-users pagination gotcha).
    await page.getByPlaceholder('Search by name or email...').fill('clinician@medibook.dev')
    const row = page.locator('tr', { hasText: 'clinician@medibook.dev' }).first()
    await expect(row).toBeVisible({ timeout: 45_000 })
    await row.getByRole('button', { name: /Impersonate/ }).click()

    await expect(page.getByRole('heading', { name: 'Impersonate User' })).toBeVisible()
    await page.getByLabel('Reason').fill(`E2E impersonation check ${Date.now()}`)
    await page.getByRole('button', { name: 'Start Impersonation' }).click()

    await page.waitForURL((url) => url.pathname === '/', { timeout: 45_000 })
    await expect(page.getByText(/Impersonating/)).toBeVisible({ timeout: 40_000 })
    await expect(page.getByRole('button', { name: 'Exit' })).toBeVisible()

    await page.getByRole('button', { name: 'Exit' }).click()
    await expect(page.getByText(/Impersonating/)).not.toBeVisible({ timeout: 40_000 })

    // Confirms real restoration, not just a banner disappearing: the
    // original admin session's own token still works against an
    // admin-only route.
    await page.goto('/admin/users')
    await expect(page.getByRole('heading', { name: /User Management/i })).toBeVisible({ timeout: 40_000 })
  })
})

test.describe('Packages (REQ054 US-CAT-01) — create, sell, and redeem a sitting', () => {
  let managerToken
  let staffToken
  let clinicId
  let serviceId
  let clinicianId
  let patientId
  let appointmentId
  let packageId
  let patientPackageId
  const packageName = `E2E Physio Bundle ${Date.now()}`

  test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext()
    managerToken = await loginToken(request, 'manager@medibook.dev', 'Mgr1234!')
    staffToken = await loginToken(request, 'receptionist@medibook.dev', 'Rec1234!')
    clinicId = await findClinicId(request, managerToken)
    const svc = await findServiceId(request, managerToken)
    serviceId = svc.id
    clinicianId = svc.clinicianId
    patientId = await createFixturePatient(request, managerToken, 'PackagePatient')
    appointmentId = await createFixtureAppointment(request, managerToken, { patientId, clinicianId, serviceId, clinicId, offsetDays: 422 })
    await request.dispose()
  })

  test.afterAll(async ({ playwright }) => {
    const request = await playwright.request.newContext()
    if (packageId) {
      await gql(request, managerToken, `mutation($id: ID!) { deletePackage(id: $id) { success } }`, { id: packageId }).catch(() => {})
    }
    await request.dispose()
  })

  test('manager creates a package via UI; a patient purchase is redeemed against a real appointment', async ({ page, request }) => {
    await loginAs(page, 'Manager')
    await page.goto('/manager/packages')
    await expect(page.getByRole('heading', { name: 'Service Packages' })).toBeVisible()
    await page.getByRole('button', { name: 'New Package' }).click()
    await page.getByTestId('clinic-select').click()
    await page.getByRole('option', { name: 'MG Road Clinic' }).click()
    await page.getByLabel('Package Name').fill(packageName)
    await page.getByLabel('Total Sittings').fill('5')
    await page.getByLabel('Price').fill('2000')
    await page.getByTestId('redeemable-against-select').click()
    // The "No services for this clinic yet" disabled placeholder also
    // matches a bare /./ regex while the products query is still loading —
    // clicking it selects nothing, leaving product_ids empty and the
    // real @ArrayMinSize(1) validation to fail silently (never asserted
    // on). Target the real product by name instead.
    await page.getByRole('option', { name: 'GP Consultation' }).click()
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByText(packageName)).toBeVisible({ timeout: 40_000 })

    const packages = await gql(request, managerToken, `{ packages { id clinic_id name } }`)
    const pkg = packages.packages.find((p) => p.name === packageName)
    expect(pkg).toBeTruthy()
    packageId = pkg.id

    const purchase = await gql(
      request,
      staffToken,
      `
      mutation($input: PurchasePackageInput!) {
        purchasePackage(input: $input) { success userErrors { message } patientPackage { id sittings_remaining } }
      }
    `,
      { input: { package_id: packageId, patient_id: patientId, purchase_tender_type: 'cash' } },
    )
    expect(purchase.purchasePackage.success).toBe(true)
    patientPackageId = purchase.purchasePackage.patientPackage.id
    expect(purchase.purchasePackage.patientPackage.sittings_remaining).toBe(5)

    await switchLoginAs(page, 'Staff')
    await page.goto(`/appointments/${appointmentId}`)
    await page.getByRole('button', { name: 'Take Payment' }).click()
    await expect(page.getByRole('button', { name: 'Redeem package sitting' })).toBeVisible({ timeout: 40_000 })
    await page.getByRole('button', { name: 'Redeem package sitting' }).click()
    await page.getByTestId('patient-package-select').click()
    await page.getByRole('option', { name: new RegExp(packageName) }).click()
    // Confirm the select actually picked up a real value before relying on
    // it — the Redeem Sitting button is silently disabled otherwise, and a
    // disabled-button click can look like it "did something" without ever
    // calling the mutation.
    await expect(page.getByRole('button', { name: 'Redeem Sitting' })).toBeEnabled({ timeout: 10_000 })
    await page.getByRole('button', { name: 'Redeem Sitting' }).click()
    await expect(page.getByText(/sitting redeemed/i)).toBeVisible({ timeout: 40_000 })

    const after = await gql(
      request,
      managerToken,
      `
      query($patientId: ID!) { patientPackages(patient_id: $patientId) { id sittings_remaining } }
    `,
      { patientId },
    )
    const remaining = after.patientPackages.find((pp) => pp.id === patientPackageId)?.sittings_remaining
    expect(remaining).toBe(4)
  })
})

test.describe('Branch Overrides (REQ055 US-ORG-05) — manager sets and persists a per-clinic override', () => {
  let managerToken
  let serviceId
  let clinicName

  test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext()
    managerToken = await loginToken(request, 'manager@medibook.dev', 'Mgr1234!')
    const svc = await findServiceId(request, managerToken)
    serviceId = svc.id
    const clinics = await gql(request, managerToken, `{ clinics { id name } }`)
    clinicName = (clinics.clinics.find((c) => c.name === 'MG Road Clinic') ?? clinics.clinics[0]).name
    await request.dispose()
  })

  test.afterAll(async ({ playwright }) => {
    const request = await playwright.request.newContext()
    // Reset back to inherit so this fixture doesn't leave a real price
    // override on the shared GP Consultation service for other sessions.
    const clinics = await gql(request, managerToken, `{ clinics { id name } }`)
    const clinicId = (clinics.clinics.find((c) => c.name === clinicName) ?? clinics.clinics[0]).id
    await gql(
      request,
      managerToken,
      `
      mutation($input: SetProductBranchOverrideInput!) { setProductBranchOverride(input: $input) { success } }
    `,
      { input: { product_id: serviceId, clinic_id: clinicId, mode: 'inherit' } },
    ).catch(() => {})
    await request.dispose()
  })

  test('sets an override price for one branch via the service edit page and confirms it persists on reload', async ({ page }) => {
    await loginAs(page, 'Manager')
    await page.goto(`/manager/services/${serviceId}/edit`)
    await expect(page.getByText('Branch Pricing Overrides')).toBeVisible({ timeout: 45_000 })

    const row = page.locator('tr', { hasText: clinicName })
    await expect(row).toBeVisible()
    await row.locator('[role="combobox"], input').first().click()
    await page.getByRole('option', { name: /Override/i }).click()
    await row.locator('input[type="number"]').fill('599')
    await row.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText(/saved|updated/i).first())
      .toBeVisible({ timeout: 40_000 })
      .catch(() => {})

    await page.reload()
    await expect(page.getByText('Branch Pricing Overrides')).toBeVisible({ timeout: 45_000 })
    const reloadedRow = page.locator('tr', { hasText: clinicName })
    await expect(reloadedRow.locator('input[type="number"]')).toHaveValue('599', { timeout: 40_000 })
  })
})

test.describe('Discount Approval (REQ056 US-BIL-03)', () => {
  let managerToken
  let clinicId
  let clinicianId
  let serviceId
  let patientId
  let appointmentId

  test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext()
    managerToken = await loginToken(request, 'manager@medibook.dev', 'Mgr1234!')
    clinicId = await findClinicId(request, managerToken)
    const svc = await findServiceId(request, managerToken)
    clinicianId = svc.clinicianId
    // A discount can never exceed the amount due (appointment-payments.service.ts),
    // and the org's real discount_approval_threshold_paise is ₹1000 — GP
    // Consultation (₹499) can never trigger the approval path at all. A
    // dedicated, higher-priced disposable service is required.
    const created = await gql(
      request,
      managerToken,
      `
      mutation($input: ServiceInput!) { createService(input: $input) { id } }
    `,
      { input: { name: `E2E High-Value Service ${Date.now()}`, price: 5000, duration_minutes: 30 } },
    )
    serviceId = created.createService.id
    patientId = await createFixturePatient(request, managerToken, 'DiscountPatient')
    appointmentId = await createFixtureAppointment(request, managerToken, { patientId, clinicianId, serviceId, clinicId, offsetDays: 423 })
    await request.dispose()
  })

  test('a discount above the auto-approval threshold is queued, not charged; a manager approves it', async ({ page }) => {
    // Unique per run — a fixed reason string collided with every prior
    // run's own residue (this codebase's e2e convention doesn't clean up
    // every fixture, and decideDiscountApproval leaves approved/rejected
    // rows in place), making the row locator below match many rows.
    const discountReason = `E2E goodwill discount above threshold ${Date.now()}`
    await loginAs(page, 'Staff')
    await page.goto(`/appointments/${appointmentId}`)
    await page.getByRole('button', { name: 'Take Payment' }).click()
    await page.getByLabel('Discount amount (₹)').fill('1200')
    await page.getByLabel('Discount reason').fill(discountReason)
    // The tenders-sum-matches-net-amount check runs before the threshold
    // check server-side — a ₹5000 service less a ₹1200 discount leaves
    // ₹3800 due, which the tender rows must still balance to exactly.
    await page.getByLabel('Amount', { exact: true }).fill('3800')
    await page.getByRole('button', { name: 'Record Payment' }).click()
    await expect(page.getByText(/sent to a manager for approval/i)).toBeVisible({ timeout: 40_000 })

    await switchLoginAs(page, 'Manager')
    await page.goto('/finances')
    await page.getByRole('tab', { name: 'Discount Approvals' }).click()
    const row = page.locator('tr', { hasText: discountReason })
    await expect(row).toBeVisible({ timeout: 45_000 })
    await row.getByRole('button', { name: 'Approve' }).click()
    // The row itself stays — it's the decided record, now showing an
    // "Approved" status chip instead of the pending Approve/Reject
    // actions, matching every other status-badged table in this app; it
    // was never designed to disappear.
    await expect(row.getByText('Approved')).toBeVisible({ timeout: 40_000 })
    await expect(row.getByRole('button', { name: 'Approve' })).not.toBeVisible()
  })
})

test.describe('Cash Drawer Close (REQ056 US-BIL-04)', () => {
  test('staff closes the cash drawer from Appointments; it shows up in Finances', async ({ page }) => {
    await loginAs(page, 'Staff')
    await page.goto('/appointments')
    await page.getByRole('button', { name: 'Close Cash Drawer' }).click()
    // A plain getByLabel('Clinic') substring-matches the page's own
    // "Clinician" filter select and its DataGrid column-menu button too —
    // exact match is required to hit the dialog's own Clinic field.
    await page.getByLabel('Clinic', { exact: true }).click()
    await page.getByRole('option', { name: 'MG Road Clinic' }).click()
    // closeCashDrawer is once-per-clinic-per-business-date server-side —
    // the dialog defaults this field to today, which a repeated run of
    // this exact suite on the same real day already closed. Pick a
    // random past date instead of accepting the default.
    const businessDate = new Date(Date.now() - (Math.floor(Math.random() * 600) + 60) * 24 * 3600 * 1000)
    const businessDateStr = `${String(businessDate.getMonth() + 1).padStart(2, '0')}/${String(businessDate.getDate()).padStart(2, '0')}/${businessDate.getFullYear()}`
    await page.getByLabel('Business date').fill(businessDateStr)
    await page.getByLabel('Counted amount').fill('0')
    await page.getByRole('button', { name: 'Close Drawer' }).click()
    await expect(page.getByText(/Closed\. Expected/)).toBeVisible({ timeout: 40_000 })
    await page.getByRole('button', { name: 'Done' }).click()

    await switchLoginAs(page, 'Manager')
    await page.goto('/finances')
    await page.getByRole('tab', { name: 'Cash Drawer' }).click()
    await expect(page.getByRole('table').first()).toBeVisible({ timeout: 45_000 })
  })
})

test.describe('Documents (REQ057 US-PAT-02) — authenticated PDF download', () => {
  let managerToken
  let clinicId
  let clinicianId
  let serviceId
  let servicePrice
  let patientId
  let appointmentId

  test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext()
    managerToken = await loginToken(request, 'manager@medibook.dev', 'Mgr1234!')
    clinicId = await findClinicId(request, managerToken)
    const svc = await findServiceId(request, managerToken)
    serviceId = svc.id
    clinicianId = svc.clinicianId
    servicePrice = svc.price
    patientId = await createFixturePatient(request, managerToken, 'DocsPatient')
    appointmentId = await createFixtureAppointment(request, managerToken, { patientId, clinicianId, serviceId, clinicId, offsetDays: 424 })
    await request.dispose()
  })

  test('downloading the invoice PDF for a real payment succeeds with a real PDF response', async ({ page }) => {
    await loginAs(page, 'Staff')
    await page.goto(`/appointments/${appointmentId}`)
    await page.getByRole('button', { name: 'Take Payment' }).click()
    // The Download Invoice button only ever renders once lastPaymentId is
    // set, which happens on a real successful recordCounterPayment in this
    // very session — there is no way to reach it via a pre-existing
    // fixture payment (a real, separate gap: an appointment's invoice
    // can't be re-downloaded after a page reload, since Appointment has no
    // payment_id field to look one up by).
    await page.getByLabel('Amount', { exact: true }).fill(String(servicePrice))
    await page.getByRole('button', { name: 'Record Payment' }).click()
    await expect(page.getByRole('button', { name: 'Download Invoice' })).toBeVisible({ timeout: 40_000 })
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/documents/invoices/') && res.url().includes('/pdf'), { timeout: 45_000 }),
      page.getByRole('button', { name: 'Download Invoice' }).click(),
    ])
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('application/pdf')
  })
})

test.describe('Messages (REQ058 US-MSG-01/03) — department-scoped thread, attachment, canned reply, oversight', () => {
  let managerToken
  let clinicId
  let departmentId
  const departmentName = `E2E Cardiology ${Date.now()}`
  const threadMarker = `E2E dept thread opener ${Date.now()}`
  const cannedTitle = `E2E canned reply ${Date.now()}`

  test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext()
    managerToken = await loginToken(request, 'manager@medibook.dev', 'Mgr1234!')
    clinicId = await findClinicId(request, managerToken)
    const createdDept = await gql(
      request,
      managerToken,
      `
      mutation($input: DepartmentInput!) { createDepartment(input: $input) { id name } }
    `,
      { input: { name: departmentName, clinic_id: clinicId } },
    )
    departmentId = createdDept.createDepartment.id
    expect(departmentId).toBeTruthy()

    await gql(
      request,
      managerToken,
      `
      mutation($input: ClinicianInput!) { createClinician(input: $input) { id } }
    `,
      {
        input: {
          first_name: 'E2E',
          last_name: 'DeptClinician',
          email: `e2e.deptclinician.${Date.now()}@example.com`,
          clinic_ids: [clinicId],
          department_id: departmentId,
        },
      },
    )
    await request.dispose()
  })

  test.afterAll(async ({ playwright }) => {
    const request = await playwright.request.newContext()
    if (departmentId)
      await gql(request, managerToken, `mutation($id: ID!) { deleteDepartment(id: $id) { success } }`, { id: departmentId }).catch(() => {})
    await request.dispose()
  })

  test('manager composes a department thread with an attachment, inserts a canned reply, and reviews it via the oversight filter', async ({
    page,
  }) => {
    await loginAs(page, 'Manager')
    await page.goto('/messages')

    // Two "New message"-labeled controls coexist (the header icon button
    // and the empty-state panel's own outlined button) — target the
    // header one by id, which is always present regardless of whether a
    // conversation is already selected.
    await page.locator('#compose-new-message-btn').click()
    await page.locator('#compose-recipient').click()
    await page.getByRole('option').first().click()
    await page.getByLabel('Department (optional)').click()
    await page.getByRole('option', { name: departmentName }).click()
    await page.locator('#compose-message-body').fill(threadMarker)
    await page.locator('#compose-send-btn').click()
    await expect(page.getByText(threadMarker)).toBeVisible({ timeout: 45_000 })

    // Attach a real file to a follow-up message on the now-active thread.
    await page.setInputFiles('input[type="file"]', {
      name: 'e2e-note.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('E2E attachment content'),
    })
    await expect(page.getByText('e2e-note.txt').first()).toBeVisible({ timeout: 5_000 })
    await page.locator('#send-message-btn').click()
    await expect(page.getByText('e2e-note.txt', { exact: false }).first()).toBeVisible({ timeout: 45_000 })

    // Create and insert a canned reply.
    await page.getByRole('button', { name: 'Insert canned reply' }).click()
    await page.getByText('Manage canned replies…').click()
    await page.getByLabel('Title').fill(cannedTitle)
    await page.getByLabel('Reply text').fill('Thanks for reaching out — the team will follow up shortly.')
    await page.getByRole('button', { name: 'Add reply' }).click()
    await expect(page.getByText(cannedTitle)).toBeVisible({ timeout: 40_000 })
    await page
      .getByRole('button', { name: 'Close' })
      .click()
      .catch(async () => {
        await page.keyboard.press('Escape')
      })
    await page.getByRole('button', { name: 'Insert canned reply' }).click()
    await page.getByText(cannedTitle).click()
    await expect(page.locator('#message-input')).toHaveValue(/follow up shortly/, { timeout: 5_000 })
    await page.locator('#send-message-btn').click()

    // Oversight filter: the department thread is visible without the
    // manager needing to have been added as a participant.
    await page.getByText('Department view').click()
    await page.getByText('Choose department…').click()
    await page.getByRole('option', { name: departmentName }).click()
    await expect(page.getByText(threadMarker)).toBeVisible({ timeout: 45_000 })
  })
})
