import { execSync } from 'child_process'
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// REQ059 (project-plans/08-integration-gap-analysis.md A-2/A-3) — the
// pharmacy page had real, tested backend CRUD for the drug catalog and a
// real dispensePrescriptionItem/stockMovements pair, with zero frontend
// UI for any of the three. This spec proves all three against the real
// backend: a drug created through the UI appears in the receive-stock
// dropdown, a real prescription item dispensed against a real batch
// decrements its remaining stock, and the resulting movement appears in
// that batch's own History dialog. Also covers the route/nav fix (staff,
// not just manager, can now reach this page — matching the backend's own
// @Auth('staff','manager','admin','super_admin') gate).

const GRAPHQL_URL = process.env.E2E_GRAPHQL_URL || 'http://localhost:4000/graphql'
const REAL_CLINICIAN_ID = '8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7' // Sarah Mitchell
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

test.describe.configure({ mode: 'serial' })

let managerToken
let clinicId
let drugId
let patientId
let patientName
let patientLastName
let batchNumber

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext()
  const authData = await gql(request, null, `
    mutation { login(input: {email: "manager@medibook.dev", password: "Mgr1234!"}) { ... on AuthPayload { access_token } } }
  `)
  managerToken = authData.login.access_token

  const clinicsData = await gql(request, managerToken, `{ clinics { id name } }`)
  clinicId = (clinicsData.clinics.find((c) => c.name === 'MG Road Clinic') ?? clinicsData.clinics[0]).id

  const drugsData = await gql(request, managerToken, `{ drugs { id name } }`)
  drugId = drugsData.drugs[0].id

  // A real batch with stock, so the dispense flow's batch picker has a
  // real match for the seeded drug used in the prescription below.
  batchNumber = `E2E-DISPENSE-${Date.now()}`
  await gql(request, managerToken, `
    mutation($input: ReceiveStockInput!) { receiveStock(input: $input) { id } }
  `, { input: { drug_id: drugId, clinic_id: clinicId, batch_number: batchNumber, expiry_date: '2028-01-01', quantity: 100 } })

  // Real patient → real appointment → real encounter → real prescription
  // (createPrescription is clinician-only — link the demo clinician
  // account to a real clinician for the duration, same pattern as
  // clinician-portal.spec.js/clinician-dashboard.spec.js).
  patientLastName = `Dispense${Date.now()}`
  const patientData = await gql(request, managerToken, `
    mutation($input: PatientInput!) { createPatient(input: $input) { id full_name } }
  `, { input: { first_name: 'E2E', last_name: patientLastName, email: `e2e.dispense.${Date.now()}@example.com`, phone: `9${Date.now().toString().slice(-9)}`, date_of_birth: '1990-01-01' } })
  patientId = patientData.createPatient.id
  patientName = patientData.createPatient.full_name

  const servicesData = await gql(request, managerToken, `{ services { id name clinicians { id } } }`)
  const svc = servicesData.services.find((s) => s.clinicians.some((c) => c.id === REAL_CLINICIAN_ID)) ?? servicesData.services[0]

  const start = new Date(Date.now() + (500 + Math.floor(Math.random() * 300)) * 24 * 3600 * 1000)
  const apptData = await gql(request, managerToken, `
    mutation($input: AppointmentInput!) { createAppointment(input: $input) { id } }
  `, { input: { patient_id: patientId, clinician_id: REAL_CLINICIAN_ID, service_id: svc.id, clinic_id: clinicId, start_datetime: start.toISOString() } })

  execSync(
    `docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -c "UPDATE \\"UserProfiles\\" SET clinician_id = '${REAL_CLINICIAN_ID}' WHERE email = 'clinician@medibook.dev';"`,
  )
  const clinAuth = await gql(request, null, `
    mutation { login(input: {email: "clinician@medibook.dev", password: "Cln1234!"}) { ... on AuthPayload { access_token } } }
  `)
  const clinicianToken = clinAuth.login.access_token

  const encounterData = await gql(request, clinicianToken, `
    mutation($appointment_id: ID!) { getOrCreateEncounter(appointment_id: $appointment_id) { id } }
  `, { appointment_id: apptData.createAppointment.id })

  await gql(request, clinicianToken, `
    mutation($input: CreatePrescriptionInput!) { createPrescription(input: $input) { id } }
  `, { input: { encounter_id: encounterData.getOrCreateEncounter.id, items: [{ drug_id: drugId, dose: '1 tablet', frequency: 'OD', duration_days: 5 }] } })

  execSync(
    `docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -c "UPDATE \\"UserProfiles\\" SET clinician_id = NULL WHERE email = 'clinician@medibook.dev';"`,
  )

  await request.dispose()
})

test('staff can reach the pharmacy page via the sidebar nav (not just manager)', async ({ page }) => {
  await loginAs(page, 'Staff')
  await expect(page.getByText('Pharmacy', { exact: true })).toBeVisible({ timeout: 15_000 })
  await page.getByText('Pharmacy', { exact: true }).click()
  await page.waitForURL('**/manager/pharmacy', { timeout: 15_000 })
  await expect(page.getByRole('tab', { name: 'Stock' })).toBeVisible({ timeout: 15_000 })
})

test('a drug created through the UI appears in the receive-stock dropdown', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/manager/pharmacy')
  await expect(page.getByRole('tab', { name: 'Stock' })).toBeVisible({ timeout: 15_000 })

  await page.getByRole('tab', { name: 'Drug Catalog' }).click()
  await page.getByRole('button', { name: 'Add Drug' }).first().click()
  const drugName = `E2E Drug ${Date.now()}`
  await page.getByLabel('Name').fill(drugName)
  await page.locator('button[type="submit"]', { hasText: 'Add Drug' }).click()
  await expect(page.getByText('Drug added to catalog.')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('cell', { name: drugName }).first()).toBeVisible({ timeout: 15_000 })

  await page.getByRole('tab', { name: 'Stock' }).click()
  await page.getByRole('button', { name: 'Receive Stock' }).click()
  await page.getByLabel('Drug').click()
  await expect(page.getByRole('option', { name: drugName })).toBeVisible({ timeout: 15_000 })
})

test('a real dispense decrements the batch and appears in its movement history', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/manager/pharmacy')
  await expect(page.getByRole('tab', { name: 'Stock' })).toBeVisible({ timeout: 15_000 })

  await page.getByRole('tab', { name: 'Dispense' }).click()
  // patients()'s own search matches first_name/last_name/email/phone
  // individually via `contains` -- not a combined "first last" substring
  // -- so the search term must be a real substring of one real field.
  await page.getByLabel('Search patient by name, email, or phone').fill(patientLastName)
  await expect(page.getByText(patientName).first()).toBeVisible({ timeout: 15_000 })
  await page.getByText(patientName).first().click()

  await expect(page.getByRole('button', { name: 'Dispense' })).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Dispense' }).click()

  await page.getByTestId('dispense-batch-select').click()
  await page.getByRole('option', { name: new RegExp(batchNumber) }).click()
  await page.getByLabel('Quantity').fill('3')
  // MUI's Dialog marks the rest of the page aria-hidden while open, so the
  // row's own "Dispense" button drops out of the accessibility tree here —
  // only the dialog's own submit button matches once it's open.
  await page.getByRole('dialog').getByRole('button', { name: 'Dispense' }).click()
  await expect(page.getByText('Dispensed.')).toBeVisible({ timeout: 15_000 })

  await page.getByRole('tab', { name: 'Stock' }).click()
  const row = page.getByRole('row', { name: new RegExp(batchNumber) })
  await expect(row.getByText('97')).toBeVisible({ timeout: 15_000 })

  await row.getByLabel(`History for ${batchNumber}`).click()
  await expect(page.getByText('Prescription dispense')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('-3')).toBeVisible()
})
