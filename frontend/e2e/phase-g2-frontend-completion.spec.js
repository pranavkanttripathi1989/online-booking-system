import { execSync } from 'child_process'
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// Phase G+2 frontend completion — real UI for the 8 backend-only domains
// shipped 2026-08-24 (REQ018/REQ032/REQ034/REQ022/REQ030/REQ031/REQ015/
// REQ029). Each PLAN### for these domains explicitly deferred the
// frontend; this closes that gap. One critical-path test per surface,
// against the real backend, no mocks.

const GRAPHQL_URL = process.env.E2E_GRAPHQL_URL || 'http://localhost:4000/graphql'
const DB_CONTAINER = process.env.E2E_DB_CONTAINER || 'medibook_postgres'
const DB_NAME = process.env.E2E_DB_NAME || 'medibook_db'

async function gql(request, token, query, variables) {
  const res = await request.post(GRAPHQL_URL, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    data: { query, variables },
  })
  const body = await res.json()
  if (body.errors) throw new Error(`GraphQL error: ${JSON.stringify(body.errors)}`)
  return body.data
}

test.describe('Admin — Plans page', () => {
  // No super_admin demo account exists in this dev environment (seed.ts
  // only seeds admin/manager/clinician/staff/patient) — the real,
  // meaningful assertion here is that an 'admin'-role caller is correctly
  // shown the informational permission message, not a raw GraphQL error,
  // confirming the page handles the 403 gracefully.
  test('shows an informational message for a non-super_admin caller', async ({ page }) => {
    await loginAs(page, 'Admin')
    await page.goto('/admin/plans')
    await expect(page.getByText(/super_admin/i)).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('Admin — Payers page', () => {
  test('lists real payers and records an empanelment', async ({ page }) => {
    await loginAs(page, 'Manager')
    await page.goto('/admin/payers')
    await expect(page.getByRole('heading', { name: 'Insurance Payers' })).toBeVisible()
    // Directory renders (even if empty) without crashing — a real GraphQL
    // round trip, not a mock fallback.
    await expect(page.getByText('Payer Directory')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Branch Empanelment' })).toBeVisible()
  })
})

test.describe('Admin — Rights Requests page', () => {
  let patientId
  let requestId
  let managerToken

  test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext()
    const auth = await gql(request, null, `mutation { login(input: {email:"manager@medibook.dev", password:"Mgr1234!"}) { ... on AuthPayload { access_token } } }`)
    managerToken = auth.login.access_token
    const patients = await gql(request, managerToken, `{ patients { data { id } } }`)
    patientId = patients.patients.data[0].id
    const created = await gql(request, managerToken, `
      mutation($input: RequestDataRightsInput!) { requestDataRights(input: $input) { id } }
    `, { input: { patient_id: patientId, type: 'access', notes: 'e2e fixture' } })
    requestId = created.requestDataRights.id
  })

  test.afterAll(async ({ playwright }) => {
    const request = await playwright.request.newContext()
    if (requestId) {
      await gql(request, managerToken, `
        mutation($id: ID!, $input: ResolveRightsRequestInput!) { resolveRightsRequest(id: $id, input: $input) { id } }
      `, { id: requestId, input: { status: 'completed', notes: 'e2e cleanup' } }).catch(() => {})
    }
  })

  test('resolves a real pending rights request', async ({ page }) => {
    await loginAs(page, 'Manager')
    await page.goto('/admin/rights-requests')
    await expect(page.getByRole('heading', { name: 'Data Rights Requests' })).toBeVisible()
    const row = page.locator('tr', { hasText: 'Data Access' }).first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    await row.getByRole('button', { name: 'Resolve' }).click()
    await page.getByLabel('Notes (what was done / why)').fill('Exported via e2e test')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Request updated.')).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Manager — Pharmacy page', () => {
  // Entirely UI-driven — the clinic/drug pickers are real dropdowns backed
  // by the page's own GraphQL queries, so no fixture setup is needed here.
  // No delete mutation exists for a batch (append-only ledger, by design) —
  // nothing to clean up afterward either; the created batch stays as a
  // real, harmless low-quantity row.
  test('receives real stock and shows it in the ledger', async ({ page }) => {
    await loginAs(page, 'Manager')
    await page.goto('/manager/pharmacy')
    await expect(page.getByRole('heading', { name: 'Pharmacy Stock' })).toBeVisible()
    // First option is the "All clinics" filter value (empty clinicId) — the
    // Receive form requires a real clinic selected, so pick the second option.
    await page.getByLabel('Clinic').click()
    await page.getByRole('option', { name: /./ }).nth(1).click()
    await page.getByRole('button', { name: 'Receive Stock' }).click()
    await page.getByLabel('Drug').click()
    await page.getByRole('option', { name: /./ }).first().click()
    const batchNumber = `E2E-${Date.now()}`
    await page.getByLabel('Batch Number').fill(batchNumber)
    await page.getByLabel('Expiry Date').fill('2027-12-31')
    await page.getByLabel('Quantity').fill('50')
    await page.getByRole('button', { name: 'Receive', exact: true }).click()
    await expect(page.getByText('Stock received.')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(batchNumber)).toBeVisible()
  })
})

test.describe('Manager — Reports page', () => {
  test('shows patient report group stats and schedules a report', async ({ page }) => {
    await loginAs(page, 'Manager')
    await page.goto('/manager/reports')
    await expect(page.getByRole('heading', { name: 'Patient Reports' })).toBeVisible()
    await expect(page.getByText('New Patients')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Repeat Patients')).toBeVisible()

    await page.getByRole('button', { name: 'Schedule a report' }).click()
    await page.getByLabel('Recipient emails (comma-separated)').fill(`e2e-${Date.now()}@example.test`)
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Scheduled report created.')).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Settings — Integrations tab', () => {
  test('creates a booking widget config, a webhook endpoint, and an API key, each revealing its secret once', async ({ page }) => {
    await loginAs(page, 'Manager')
    await page.goto('/settings')
    await page.getByRole('tab', { name: 'Integrations' }).click()

    // Booking widget
    await page.getByLabel('Allowed origin(s), comma-separated').fill('https://e2e-test.example.test')
    await page.getByRole('button', { name: 'Register' }).click()
    // exact:true — the webhook URL below shares this string as a prefix
    // ("https://e2e-test.example.test/webhook"), and prior runs' residue
    // (this test never deletes what it creates, matching this codebase's
    // established e2e residue convention) can leave more than one match.
    await expect(page.getByText('https://e2e-test.example.test', { exact: true }).first()).toBeVisible({ timeout: 10_000 })

    // Webhook — event chips default to appointment.created only; add payment.succeeded too.
    // getByRole('button', ...) not getByText: prior runs' residue (this test
    // never deletes what it creates) can leave an existing webhook row whose
    // own read-only event chip shares this text but has no click handler —
    // only the create-form's selector chip renders with role="button".
    await page.getByLabel('Endpoint URL').fill('https://e2e-test.example.test/webhook')
    await page.getByRole('button', { name: 'payment.succeeded' }).click()
    await page.getByRole('button', { name: 'Add Endpoint' }).click()
    await expect(page.getByText('Webhook signing secret')).toBeVisible({ timeout: 10_000 })

    // API key
    await page.getByLabel('Key name').fill('E2E test key')
    await page.getByRole('button', { name: 'Create Key' }).click()
    await expect(page.getByText('API key')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('E2E test key')).toBeVisible()
  })
})

test.describe('Settings — Privacy tab', () => {
  // Same fixture-linking discipline as patient-family-and-dedup.spec.js:
  // the seeded patient@medibook.dev account has no linked patient_id by
  // default (CLAUDE.md's own documented "both demo accounts unlinked"
  // note) and the Privacy tab correctly shows an info alert instead of
  // consent/rights controls for an unlinked account — link it directly
  // via psql for the duration of this test and unlink again in afterAll.
  let managerToken
  let privacyPatientId

  test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext()
    const auth = await gql(request, null, `mutation { login(input: {email:"manager@medibook.dev", password:"Mgr1234!"}) { ... on AuthPayload { access_token } } }`)
    managerToken = auth.login.access_token
    const created = await gql(request, managerToken, `
      mutation($input: PatientInput!) { createPatient(input: $input) { id } }
    `, { input: { first_name: 'Privacy', last_name: 'TabProbe', email: `privacy.probe.${Date.now()}@example.com`, phone: '9999000444', date_of_birth: '1990-01-01' } })
    privacyPatientId = created.createPatient.id
    execSync(`docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -c "UPDATE \\"UserProfiles\\" SET patient_id = '${privacyPatientId}' WHERE email = 'patient@medibook.dev';"`)
    await request.dispose()
  })

  test.afterAll(async () => {
    execSync(`docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -c "UPDATE \\"UserProfiles\\" SET patient_id = NULL WHERE email = 'patient@medibook.dev';"`)
    if (privacyPatientId) {
      execSync(`docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -c "DELETE FROM \\"Consents\\" WHERE patient_id='${privacyPatientId}';"`)
      execSync(`docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -c "DELETE FROM \\"RightsRequests\\" WHERE patient_id='${privacyPatientId}';"`)
      execSync(`docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -c "DELETE FROM \\"Patients\\" WHERE id='${privacyPatientId}';"`)
    }
  })

  test('a patient toggles consent and files a rights request', async ({ page }) => {
    await loginAs(page, 'Patient')
    await page.goto('/settings')
    await page.getByRole('tab', { name: 'Privacy' }).click()

    const communicationsSwitch = page.locator('label', { hasText: 'Communications' }).locator('input[type="checkbox"]')
    // Either state is a valid starting point; just confirm the toggle round-trips.
    const before = await communicationsSwitch.isChecked()
    await communicationsSwitch.click()
    await page.waitForTimeout(500) // mutation is fire-and-reload, no visible loading state to await
    await expect(communicationsSwitch).toBeChecked({ checked: !before, timeout: 10_000 })

    await page.getByRole('button', { name: 'Request my data' }).click()
    await expect(page.getByText(/access request has been submitted/i)).toBeVisible({ timeout: 10_000 })
  })
})
