import { execSync } from 'child_process'
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// project-plans/08-integration-gap-analysis.md — findings A-4 through A-8:
// real, tested backend mutations/queries with no frontend UI at all.
// A-4 clinicians.updateClinicianVerification, A-5/A-6 encounters'
// createDiagnosis/createEncounterTemplate, A-7 insurance's
// patientInsurancePolicies/createPatientInsurancePolicy, A-8 webhooks'
// webhookDeliveryLog. One critical-path scenario per finding, against the
// real backend, no mocks. `Payers` has no seeded row and createPayer is
// super_admin-only (no seeded super_admin demo account exists) — inserted
// directly via SQL, matching this suite's own established fixture pattern
// for data the real API/UI can't create.

const GRAPHQL_URL = process.env.E2E_GRAPHQL_URL || 'http://localhost:4000/graphql'
const REAL_CLINICIAN_ID = '8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7' // Sarah Mitchell, seeded
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

function psql(sql) {
  return execSync(`docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -t -A -c "${sql.replace(/"/g, '\\"')}"`).toString().trim()
}

// One cleanup statement throwing (e.g. a stale/already-deleted id from a
// prior interrupted run) must not abort every statement after it in
// afterAll — this spec's own early iterations left real Payers residue
// exactly because one unguarded failure skipped the rest of a single
// afterAll invocation.
function safePsql(sql) {
  try { psql(sql) } catch (err) { console.warn(`cleanup statement failed (continuing): ${sql}\n${err.message}`) }
}

test.describe.configure({ mode: 'serial' })

let adminToken
let managerToken
let appointmentId
let payerId
let fixturePatientId
let webhookEndpointId
let webhookProbeAppointmentId

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext()

  const adminAuth = await gql(request, null, `
    mutation { login(input: {email: "admin@medibook.dev", password: "Admin1234!"}) { ... on AuthPayload { access_token } } }
  `)
  adminToken = adminAuth.login.access_token

  const managerAuth = await gql(request, null, `
    mutation { login(input: {email: "manager@medibook.dev", password: "Mgr1234!"}) { ... on AuthPayload { access_token } } }
  `)
  managerToken = managerAuth.login.access_token

  // A-5/A-6 fixture: link the demo clinician account to the real seeded
  // clinician (same pattern as encounter-workspace.spec.js) and create a
  // disposable appointment to open a consultation against.
  execSync(
    `docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -c "UPDATE \\"UserProfiles\\" SET clinician_id = '${REAL_CLINICIAN_ID}' WHERE email = 'clinician@medibook.dev';"`,
  )
  const clinicianData = await gql(request, managerToken, `query { clinician(id: "${REAL_CLINICIAN_ID}") { clinics { id } } }`)
  const clinicId = clinicianData.clinician.clinics[0]?.id
  if (!clinicId) throw new Error('The real seeded clinician has no linked clinic — cannot create a test appointment')
  const servicesData = await gql(request, managerToken, `query { services { id } }`)
  const serviceId = servicesData.services[0]?.id

  const patientsData = await gql(request, managerToken, `query { patients(first: 1, page: 1) { data { id } } }`)
  fixturePatientId = patientsData.patients.data[0]?.id
  if (!fixturePatientId) throw new Error('No patient found in the dev DB — cannot create a test appointment')

  const apptData = await gql(request, managerToken, `
    mutation($input: AppointmentInput!) { createAppointment(input: $input) { id } }
  `, {
    input: { patient_id: fixturePatientId, clinician_id: REAL_CLINICIAN_ID, service_id: serviceId, clinic_id: clinicId, start_datetime: '2027-02-20T09:00:00.000Z', notes: 'A5A6-E2E-PROBE' },
  })
  appointmentId = apptData.createAppointment.id

  // A-7 fixture: a real Payer row (createPayer is super_admin-only and no
  // seeded super_admin demo account exists — direct insert, matching this
  // suite's own established pattern). Find-or-create so a prior run's own
  // interrupted cleanup can't leave a same-named duplicate that breaks this
  // spec's own option locator.
  const existingPayer = psql(`SELECT id FROM "Payers" WHERE name = 'E2E Star Health' LIMIT 1;`)
  payerId = existingPayer || psql(`INSERT INTO "Payers" (id, name, payer_type) VALUES (gen_random_uuid(), 'E2E Star Health', 'insurer') RETURNING id;`)

  await request.dispose()
})

test.afterAll(async () => {
  if (appointmentId) {
    safePsql(`UPDATE "Encounters" SET locked=false WHERE appointment_id='${appointmentId}';`)
    safePsql(`DELETE FROM "Encounters" WHERE appointment_id='${appointmentId}';`)
    safePsql(`DELETE FROM "Appointments" WHERE id='${appointmentId}';`)
  }
  safePsql(`UPDATE "UserProfiles" SET clinician_id = NULL WHERE email = 'clinician@medibook.dev';`)
  safePsql(`DELETE FROM "EncounterTemplates" WHERE name = 'A5A6-E2E-PROBE Template';`)
  if (fixturePatientId) {
    safePsql(`DELETE FROM "PatientInsurancePolicies" WHERE patient_id='${fixturePatientId}';`)
  }
  if (payerId) {
    safePsql(`DELETE FROM "Payers" WHERE id='${payerId}';`)
  }
  if (webhookProbeAppointmentId) {
    safePsql(`DELETE FROM "Appointments" WHERE id='${webhookProbeAppointmentId}';`)
  }
  if (webhookEndpointId) {
    safePsql(`DELETE FROM "WebhookDeliveryLog" WHERE endpoint_id='${webhookEndpointId}';`)
    safePsql(`DELETE FROM "WebhookEndpoints" WHERE id='${webhookEndpointId}';`)
  }
})

test('A-4: admin verifies a clinician from the clinician detail page', async ({ page }) => {
  test.setTimeout(60_000)
  await loginAs(page, 'Admin')
  await page.goto(`/clinicians/${REAL_CLINICIAN_ID}`)
  await expect(page.getByText('Sarah Mitchell')).toBeVisible({ timeout: 30_000 })

  const verifyResponse = page.waitForResponse((res) => res.url().includes('/graphql') && res.request().postData()?.includes('updateClinicianVerification'))
  await page.getByRole('button', { name: 'Verify' }).click()
  const response = await verifyResponse
  expect(response.ok()).toBe(true)
  const body = await response.json()
  expect(body.errors).toBeUndefined()

  await expect(page.getByText('verified', { exact: true })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('button', { name: 'Re-open for review' })).toBeVisible()

  // revert so a re-run of this spec starts from a clean 'pending' state
  await gql(page.request, adminToken, `mutation { updateClinicianVerification(id: "${REAL_CLINICIAN_ID}", status: "pending") { id } }`)
})

test('A-5/A-6: clinician records a diagnosis and saves the note as a reusable template', async ({ page }) => {
  test.setTimeout(90_000)
  await loginAs(page, 'Clinician')
  await page.goto(`/clinician/encounters/${appointmentId}`)
  await expect(page.getByText('Chief Complaints')).toBeVisible({ timeout: 15_000 })

  await page.getByRole('button', { name: 'Add Diagnosis' }).click()
  const diagnosisDialog = page.getByRole('dialog')
  await diagnosisDialog.getByLabel('Description').fill('Seasonal allergic rhinitis')
  const createDiagnosisResponse = page.waitForResponse((res) => res.url().includes('/graphql') && res.request().postData()?.includes('createDiagnosis'))
  await diagnosisDialog.getByRole('button', { name: 'Save' }).click()
  const diagResponse = await createDiagnosisResponse
  expect(diagResponse.ok()).toBe(true)
  await expect(page.getByText('Seasonal allergic rhinitis')).toBeVisible({ timeout: 10_000 })

  const advice = page.getByLabel('Advice')
  await advice.fill('Antihistamines, avoid triggers')
  await advice.blur()
  await expect(page.getByText('No templates yet.')).toBeVisible({ timeout: 10_000 })

  await page.getByRole('button', { name: 'Save as template' }).click()
  const templateDialog = page.getByRole('dialog')
  await templateDialog.getByLabel('Template Name').fill('A5A6-E2E-PROBE Template')
  const createTemplateResponse = page.waitForResponse((res) => res.url().includes('/graphql') && res.request().postData()?.includes('createEncounterTemplate'))
  await templateDialog.getByRole('button', { name: 'Save' }).click()
  const tplResponse = await createTemplateResponse
  expect(tplResponse.ok()).toBe(true)
  await expect(page.getByText('A5A6-E2E-PROBE Template')).toBeVisible({ timeout: 10_000 })
})

test('A-7: staff records a patient insurance policy', async ({ page }) => {
  test.setTimeout(60_000)
  await loginAs(page, 'Staff')
  await page.goto(`/patients/${fixturePatientId}`)
  await page.getByRole('tab', { name: /Insurance/ }).click()
  await expect(page.getByText('No insurance policies recorded for this patient yet.')).toBeVisible({ timeout: 15_000 })

  await page.getByRole('button', { name: 'Add Policy' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel(/^Payer/).click()
  await page.getByRole('option', { name: 'E2E Star Health' }).click()
  await dialog.getByLabel(/^Policy Number/).fill('E2E-POL-001')
  await dialog.getByLabel(/^Policy Holder Name/).fill('E2E Fixture Patient')
  await dialog.getByLabel(/^Valid From/).fill('2026-01-01')

  const createResponse = page.waitForResponse((res) => res.url().includes('/graphql') && res.request().postData()?.includes('createPatientInsurancePolicy'))
  await dialog.getByRole('button', { name: 'Save' }).click()
  const response = await createResponse
  expect(response.ok()).toBe(true)
  const body = await response.json()
  expect(body.errors).toBeUndefined()

  await expect(page.getByText('E2E-POL-001')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('E2E Star Health')).toBeVisible()
})

test('A-8: manager views a webhook endpoint\'s real delivery log after a live event fires', async ({ page, request }) => {
  test.setTimeout(60_000)

  // Create the endpoint against a deliberately unreachable address, then
  // trigger a real appointment.created event — matching this codebase's own
  // established Phase G+2 live-verification precedent (a webhook logged
  // 'failed' against an unreachable test endpoint, not swallowed).
  const endpointData = await gql(request, managerToken, `
    mutation($input: WebhookEndpointInput!) { createWebhookEndpoint(input: $input) { id url } }
  `, { input: { url: 'https://e2e-unreachable.invalid/hook', event_types: ['appointment.created'] } })
  webhookEndpointId = endpointData.createWebhookEndpoint.id

  const servicesData = await gql(request, managerToken, `query { services { id } }`)
  const clinicianData = await gql(request, managerToken, `query { clinician(id: "${REAL_CLINICIAN_ID}") { clinics { id } } }`)
  const probeAppt = await gql(request, managerToken, `
    mutation($input: AppointmentInput!) { createAppointment(input: $input) { id } }
  `, {
    input: { patient_id: fixturePatientId, clinician_id: REAL_CLINICIAN_ID, service_id: servicesData.services[0].id, clinic_id: clinicianData.clinician.clinics[0].id, start_datetime: '2027-02-21T10:00:00.000Z', notes: 'A8-E2E-WEBHOOK-PROBE' },
  })
  webhookProbeAppointmentId = probeAppt.createAppointment.id

  await loginAs(page, 'Manager')
  await page.goto('/settings', { waitUntil: 'networkidle' })
  await page.getByRole('tab', { name: 'Integrations' }).click()
  const row = page.locator('tr', { hasText: 'https://e2e-unreachable.invalid/hook' })
  await expect(row).toBeVisible({ timeout: 15_000 })

  const logResponse = page.waitForResponse((res) => res.url().includes('/graphql') && res.request().postData()?.includes('webhookDeliveryLog'))
  await row.getByRole('button', { name: 'Delivery Log' }).click()
  await logResponse

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('appointment.created')).toBeVisible({ timeout: 15_000 })
  await expect(dialog.getByText('failed')).toBeVisible()
})
