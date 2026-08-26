import { execSync } from 'child_process'
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// REQ020 — consultation workspace / clinical records (P0 slice). Verifies
// the real end-to-end flow: open an appointment as its treating clinician,
// start a consultation, save a structured note (persists across reload),
// apply a template, sign off (locks notes, allows an addendum). Attachment
// upload was verified live in a manual browser pass (works) but isn't
// re-covered here to keep this spec's own fixture setup smaller.
//
// BUG020 found and fixed during this spec's own live-verification pass
// (before this file existed): SaveEncounterNoteInput.content had no
// class-validator decorator, so the global ValidationPipe's
// forbidNonWhitelisted rejected every saveEncounterNote call with
// "property content should not exist" — and the frontend's onBlur handler
// had no .catch, so a clinician's typed note looked saved and was silently
// lost on reload. Fixed in encounter.input.ts (@IsString() added) and
// EncounterWorkspace.jsx (every mutation now reports its own failure via a
// snackbar). This spec's note-persists-after-reload assertion is exactly
// the regression guard for that bug.
//
// Same fixture-linking pattern as clinician-portal.spec.js: the demo
// clinician account has no linked Clinicians row by default, so every
// appointment lookup 404s for it. Temporarily links to the real seeded
// clinician for the duration of the run, reverting in afterAll. Also
// creates and fully tears down its own disposable Appointment (and
// everything REQ020 attaches to it) rather than depending on / mutating
// whatever real data happens to exist in the dev DB.

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
let templateId

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext()
  const authData = await gql(
    request,
    null,
    `
    mutation { login(input: {email: "manager@medibook.dev", password: "Mgr1234!"}) { ... on AuthPayload { access_token } } }
  `,
  )
  managerToken = authData.login.access_token

  execSync(
    `docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -c "UPDATE \\"UserProfiles\\" SET clinician_id = '${REAL_CLINICIAN_ID}' WHERE email = 'clinician@medibook.dev';"`,
  )

  const clinicianData = await gql(
    request,
    managerToken,
    `
    query { clinician(id: "${REAL_CLINICIAN_ID}") { clinics { id } } }
  `,
  )
  // Clinicians.clinic_id is singular; the GraphQL type wraps it in a
  // 0-or-1-element array (see clinician.entity.ts's own comment).
  const clinicId = clinicianData.clinician.clinics[0]?.id
  if (!clinicId) throw new Error('The real seeded clinician has no linked clinic — cannot create a test appointment')

  // Not filtered by clinic_id: appointments.service.ts's create() only
  // checks the service exists, not that it belongs to the same clinic as
  // the appointment — any org service works for this fixture's purposes.
  const servicesData = await gql(
    request,
    managerToken,
    `
    query { services { id } }
  `,
  )
  const serviceId = servicesData.services[0]?.id
  if (!serviceId) throw new Error('No service found in the dev DB — cannot create a test appointment')

  const patientsData = await gql(
    request,
    managerToken,
    `
    query { patients(first: 1, page: 1) { data { id } } }
  `,
  )
  const patientId = patientsData.patients.data[0]?.id
  if (!patientId) throw new Error('No patient found in the dev DB — cannot create a test appointment')

  // Far enough in the future to be a real, unambiguous non-terminal slot.
  const startDatetime = '2027-01-15T09:00:00.000Z'
  const apptData = await gql(
    request,
    managerToken,
    `
    mutation($input: AppointmentInput!) { createAppointment(input: $input) { id } }
  `,
    {
      input: {
        patient_id: patientId,
        clinician_id: REAL_CLINICIAN_ID,
        service_id: serviceId,
        clinic_id: clinicId,
        start_datetime: startDatetime,
        notes: 'REQ020-E2E-PROBE',
      },
    },
  )
  appointmentId = apptData.createAppointment.id

  // Org-shared template (manager token has no clinician_id, so the service
  // stamps clinician_id: null the same as org_shared: true would) -- visible
  // to any clinician in the org, including the one this test logs in as.
  const templateData = await gql(
    request,
    managerToken,
    `
    mutation($input: CreateEncounterTemplateInput!) { createEncounterTemplate(input: $input) { id name } }
  `,
    { input: { name: 'REQ020-E2E-PROBE Template', sections_json: JSON.stringify({ advice: 'Rest, fluids, review in 3 days' }) } },
  )
  templateId = templateData.createEncounterTemplate.id

  await request.dispose()
})

test.afterAll(async () => {
  // Encounters_appointment_id_fkey is ON DELETE RESTRICT, not CASCADE (a
  // clinical record must not silently vanish because its appointment was
  // deleted) -- so the Encounters row (and its own EncounterNotes/Diagnoses/
  // Attachments/EncounterAddenda children, which DO cascade from Encounters)
  // must be deleted explicitly before the Appointments row. The sign-off
  // trigger also blocks that delete while locked=true, so unlock first.
  if (appointmentId) {
    execSync(
      `docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -c "UPDATE \\"Encounters\\" SET locked=false WHERE appointment_id='${appointmentId}';"`,
    )
    execSync(
      `docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -c "DELETE FROM \\"Encounters\\" WHERE appointment_id='${appointmentId}';"`,
    )
    execSync(`docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -c "DELETE FROM \\"Appointments\\" WHERE id='${appointmentId}';"`)
  }
  execSync(
    `docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -c "UPDATE \\"UserProfiles\\" SET clinician_id = NULL WHERE email = 'clinician@medibook.dev';"`,
  )
  // No deleteEncounterTemplate mutation exists (out of scope this slice) --
  // direct cleanup.
  if (templateId) {
    execSync(
      `docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -c "DELETE FROM \\"EncounterTemplates\\" WHERE id='${templateId}';"`,
    )
  }
})

test('clinician can start a consultation, save a note that survives reload, apply a template, and sign off', async ({ page }) => {
  test.setTimeout(90_000)
  await loginAs(page, 'Clinician')

  await page.goto(`/appointments/${appointmentId}`)
  const startButton = page.getByRole('button', { name: 'Start Consultation' })
  await expect(startButton).toBeVisible({ timeout: 15_000 })
  await startButton.click()

  await page.waitForURL(`**/clinician/encounters/${appointmentId}`, { timeout: 15_000 })
  await expect(page.getByText('Chief Complaints')).toBeVisible({ timeout: 15_000 })

  // Save a note and confirm it survives a hard reload -- the exact
  // regression BUG020 introduced (silent save failure, note lost on reload).
  // Scoped by accessible name, not DOM order -- MUI's multiline TextField
  // renders a second, hidden "shadow" <textarea> per field for auto-sizing,
  // which made a plain `locator('textarea').nth(N)` count the wrong
  // element once N > 0 (found live while writing this spec).
  const complaintsField = page.getByLabel('Chief Complaints')
  await complaintsField.fill('Persistent dry cough for 5 days')
  const saveResponse = page.waitForResponse(
    (res) => res.url().includes('/graphql') && res.request().postData()?.includes('saveEncounterNote'),
  )
  await complaintsField.blur()
  const response = await saveResponse
  expect(response.ok()).toBe(true)
  const responseBody = await response.json()
  expect(responseBody.errors).toBeUndefined()

  await page.reload()
  await expect(page.getByLabel('Chief Complaints')).toHaveValue('Persistent dry cough for 5 days', { timeout: 15_000 })

  // Apply the org-shared template -- fills the Advice section in one action.
  const applyResponse = page.waitForResponse(
    (res) => res.url().includes('/graphql') && res.request().postData()?.includes('applyEncounterTemplate'),
  )
  await page.getByText('REQ020-E2E-PROBE Template').click()
  await applyResponse
  await expect(page.getByLabel('Advice')).toHaveValue('Rest, fluids, review in 3 days', { timeout: 20_000 })

  // Sign off -- locks notes, shows the Signed chip, allows an addendum.
  await page.getByRole('button', { name: 'Sign Encounter' }).click()
  await page.getByRole('button', { name: 'Sign', exact: true }).click()
  // Both the header Chip and the now-disabled "Sign Encounter" button (its
  // label switches to "Signed") match a bare text locator -- scope to the Chip.
  await expect(page.locator('.MuiChip-label', { hasText: 'Signed' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByLabel('Chief Complaints')).toBeDisabled()

  await page.getByRole('button', { name: 'Add Addendum' }).click()
  // The dialog's own accessible name ("Add Addendum") also substring-matches
  // getByLabel('Addendum') -- scope to the textbox role to disambiguate.
  await page.getByRole('textbox', { name: 'Addendum' }).fill('Follow-up: cough resolved on antibiotics')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Follow-up: cough resolved on antibiotics')).toBeVisible({ timeout: 15_000 })
})
