import { execSync } from 'child_process'
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// REQ021 — prescription builder, print view, and repeat-Rx (P0 slice).
// Verifies the real end-to-end flow: build a prescription with auto-
// calculated quantity, save a favourite set, issue it, confirm the print
// view (no watermark on the original, a "DUPLICATE" watermark on the
// second view), then repeat it into a fresh draft for review.
//
// A live manual-browser pass (per the lesson from REQ020's own two
// live-caught bugs) found one real bug before this spec was written:
// PrescriptionBuilder.jsx's handleSaveSet had no refetchQueries for
// PRESCRIPTION_SETS_QUERY, so a just-saved favourite set was correctly
// persisted (confirmed via direct query) but never appeared in the
// on-screen list until a manual reload — a clinician saving a set had no
// way to tell it worked without refreshing. Fixed by refetching after the
// mutation; not separately re-asserted here since REQ020's own pattern
// established that a real bug found via live verification gets fixed and
// documented in PLAN###/TR###, not necessarily re-proven bit-for-bit in
// the automated spec when the automated spec already exercises the fixed
// code path (this one does: step 4 below reloads-free reads the list).
//
// Same fixture-linking and full-teardown discipline as
// encounter-workspace.spec.js, including that spec's own two real lessons:
// Clinician.clinics is plural, and Prescriptions/Encounters have
// ON DELETE RESTRICT from their parents (cleanup must go child-first).

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

test.describe.configure({ mode: 'serial' })

let managerToken
let appointmentId
let issuedPrescriptionId
let prescriptionSetId

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext()
  const authData = await gql(request, null, `
    mutation { login(input: {email: "manager@medibook.dev", password: "Mgr1234!"}) { ... on AuthPayload { access_token } } }
  `)
  managerToken = authData.login.access_token

  execSync(
    `docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -c "UPDATE \\"UserProfiles\\" SET clinician_id = '${REAL_CLINICIAN_ID}' WHERE email = 'clinician@medibook.dev';"`,
  )

  const clinicianData = await gql(request, managerToken, `
    query { clinician(id: "${REAL_CLINICIAN_ID}") { clinics { id } } }
  `)
  const clinicId = clinicianData.clinician.clinics[0]?.id
  if (!clinicId) throw new Error('The real seeded clinician has no linked clinic — cannot create a test appointment')

  const servicesData = await gql(request, managerToken, `query { services { id } }`)
  const serviceId = servicesData.services[0]?.id
  if (!serviceId) throw new Error('No service found in the dev DB — cannot create a test appointment')

  const patientsData = await gql(request, managerToken, `query { patients(first: 1, page: 1) { data { id } } }`)
  const patientId = patientsData.patients.data[0]?.id
  if (!patientId) throw new Error('No patient found in the dev DB — cannot create a test appointment')

  const startDatetime = '2027-02-01T09:00:00.000Z'
  const apptData = await gql(request, managerToken, `
    mutation($input: AppointmentInput!) { createAppointment(input: $input) { id } }
  `, {
    input: {
      patient_id: patientId, clinician_id: REAL_CLINICIAN_ID, service_id: serviceId,
      clinic_id: clinicId, start_datetime: startDatetime, notes: 'REQ021-E2E-PROBE',
    },
  })
  appointmentId = apptData.createAppointment.id

  await request.dispose()
})

test.afterAll(async () => {
  // Prescriptions_encounter_id_fkey and Encounters_appointment_id_fkey are
  // both ON DELETE RESTRICT -- delete child-first: PrescriptionItems cascade
  // from Prescriptions, but Prescriptions itself must go before Encounters,
  // which must go before Appointments.
  if (appointmentId) {
    execSync(
      `docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -c "DELETE FROM \\"Prescriptions\\" WHERE encounter_id IN (SELECT id FROM \\"Encounters\\" WHERE appointment_id='${appointmentId}');"`,
    )
    execSync(
      `docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -c "DELETE FROM \\"Encounters\\" WHERE appointment_id='${appointmentId}';"`,
    )
    execSync(
      `docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -c "DELETE FROM \\"Appointments\\" WHERE id='${appointmentId}';"`,
    )
  }
  execSync(
    `docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -c "UPDATE \\"UserProfiles\\" SET clinician_id = NULL WHERE email = 'clinician@medibook.dev';"`,
  )
  // No deletePrescriptionSet mutation exists (out of scope this slice) --
  // direct cleanup. PrescriptionSetItems cascade from PrescriptionSets.
  if (prescriptionSetId) {
    execSync(
      `docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -c "DELETE FROM \\"PrescriptionSets\\" WHERE id='${prescriptionSetId}';"`,
    )
  }
})

test('clinician builds a prescription with auto-calculated qty, saves a favourite set, issues it, and repeats it', async ({ page }) => {
  test.setTimeout(90_000)
  await loginAs(page, 'Clinician')

  await page.goto(`/appointments/${appointmentId}`)
  await page.getByRole('button', { name: 'Start Consultation' }).click()
  await page.waitForURL(`**/clinician/encounters/${appointmentId}`, { timeout: 15_000 })

  await page.getByRole('button', { name: 'New Prescription' }).click()
  await page.waitForURL(/\/clinician\/prescriptions\/new/, { timeout: 15_000 })

  // Drug search + qty auto-calculation (US-RX-01): BD x 5 days -> 10.
  const drugInput = page.getByPlaceholder('Search drug…')
  await drugInput.fill('Amoxicillin')
  await page.getByRole('option', { name: /Amoxicillin/ }).click()
  const doseFields = page.locator('input[placeholder="500mg"]')
  await doseFields.first().fill('500mg')
  await page.getByRole('combobox', { name: 'Frequency' }).click()
  await page.getByRole('option', { name: 'BD', exact: true }).click()
  const durationFields = page.locator('input[type="number"]')
  await durationFields.first().fill('5')
  // qty is the second number input on the row (duration, then qty).
  await expect(durationFields.nth(1)).toHaveValue('10')

  // Save as a favourite set and confirm it appears in the list without a
  // reload -- the exact regression guard for the missing-refetch bug found
  // during this spec's own live-verification pass.
  await page.getByRole('button', { name: 'Save as Favourite Set' }).click()
  await page.getByLabel('Set name').fill('REQ021-E2E-PROBE Set')
  const createSetResponse = page.waitForResponse(
    (res) => res.url().includes('/graphql') && res.request().postData()?.includes('createPrescriptionSet'),
  )
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  const setResponse = await createSetResponse
  const setBody = await setResponse.json()
  // Captured immediately, not looked up by name after the fact -- so
  // afterAll's cleanup still runs even if a later step in this test fails.
  prescriptionSetId = setBody.data?.createPrescriptionSet?.id
  // .first(): a prior interrupted run's favourite set (same fixed name, no
  // deletePrescriptionSet mutation to have cleaned it up) can still be
  // sitting in the dev DB -- same "don't assume a stable dataset against a
  // real, growing backend" lesson as manager-services.spec.js's price
  // assertion (see CLAUDE.md).
  await expect(page.getByText('REQ021-E2E-PROBE Set').first()).toBeVisible({ timeout: 15_000 })

  // Issue the prescription -> navigates to the print view.
  const createRxResponse = page.waitForResponse(
    (res) => res.url().includes('/graphql') && res.request().postData()?.includes('createPrescription'),
  )
  await page.getByRole('button', { name: 'Issue Prescription' }).click()
  const rxResponse = await createRxResponse
  const rxBody = await rxResponse.json()
  issuedPrescriptionId = rxBody.data?.createPrescription?.id
  expect(issuedPrescriptionId).toBeTruthy()
  await page.waitForURL(`**/prescriptions/${issuedPrescriptionId}/print`, { timeout: 15_000 });

  // First view: no DUPLICATE watermark.
  await expect(page.getByText('Amoxicillin')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('DUPLICATE')).not.toBeVisible()

  // Second view (reload) -- reprint_count increments server-side, watermark appears.
  await page.reload()
  await expect(page.getByText('DUPLICATE')).toBeVisible({ timeout: 15_000 })

  // Repeat from history: back to the encounter, new prescription, pick the
  // one just issued, confirm its line pre-fills.
  await page.goto(`/clinician/encounters/${appointmentId}`)
  await page.getByRole('button', { name: 'New Prescription' }).click()
  await page.waitForURL(/\/clinician\/prescriptions\/new/, { timeout: 15_000 })
  await page.getByRole('button', { name: 'Repeat from History' }).click()
  await page.getByText(/Amoxicillin \(BD\)/).click()
  await expect(page.locator('input[placeholder="500mg"]').first()).toHaveValue('500mg', { timeout: 15_000 })
})
