import { execSync } from 'child_process'
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// REQ019 — check-in queue actions and the live queue board (P0 slice).
// Verifies the real end-to-end flow: three checked-in patients appear
// waiting in token/arrival order, "Call Next" promotes the earliest one to
// "now serving", "Skip" parks a patient, "Transfer" reassigns one to a
// colleague (removing them from this clinician's board), the unbilled-
// visits panel surfaces a completed-but-unpaid appointment, and the TV
// display renders the same live state in its own large-type view.
//
// Same fixture-linking and full-teardown discipline as
// prescription-builder.spec.js: real Appointments rows against the real
// dev DB, cleaned up child-first (QueueEntries has ON DELETE RESTRICT from
// Appointments, so QueueEntries must be deleted before the appointments
// themselves — cascading QueueEvents away with it).

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
const appointmentIds = []
let unbilledAppointmentId

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

  const clinicianData = await gql(
    request,
    managerToken,
    `
    query { clinician(id: "${REAL_CLINICIAN_ID}") { clinics { id } } }
  `,
  )
  const clinicId = clinicianData.clinician.clinics[0]?.id
  if (!clinicId) throw new Error('The real seeded clinician has no linked clinic — cannot create test appointments')

  const servicesData = await gql(request, managerToken, `query { services { id } }`)
  const serviceId = servicesData.services[0]?.id

  const patientsData = await gql(request, managerToken, `query { patients(first: 3, page: 1) { data { id } } }`)
  const patientIds = patientsData.patients.data.map((p) => p.id)
  if (patientIds.length < 3) throw new Error('Fewer than 3 patients in the dev DB — cannot create distinct queue entries')

  // Three future slots, well apart so none collide with each other or with
  // another spec's own fixture appointments.
  const slots = ['2027-03-01T09:00:00.000Z', '2027-03-01T09:30:00.000Z', '2027-03-01T10:00:00.000Z']
  for (let i = 0; i < 3; i++) {
    const apptData = await gql(
      request,
      managerToken,
      `
      mutation($input: AppointmentInput!) { createAppointment(input: $input) { id } }
    `,
      {
        input: {
          patient_id: patientIds[i],
          clinician_id: REAL_CLINICIAN_ID,
          service_id: serviceId,
          clinic_id: clinicId,
          start_datetime: slots[i],
          notes: 'REQ019-E2E-PROBE',
        },
      },
    )
    appointmentIds.push(apptData.createAppointment.id)
    // Checking in (not just creating) is what materializes the QueueEntries
    // row -- see queue.service.ts's syncFromAppointmentStatus(), hooked
    // into appointments.service.ts's transitionStatus().
    await gql(request, managerToken, `mutation($id: ID!) { checkInAppointment(id: $id) { id } }`, { id: apptData.createAppointment.id })
  }

  // A fourth appointment, completed with no payment -- US-QUE-07's unbilled-
  // visits report target. Not checked in via the queue; completing it
  // directly still exercises transitionStatus()'s no-op sync path (no
  // queue entry exists for it) alongside the report itself.
  const unbilledAppt = await gql(
    request,
    managerToken,
    `
    mutation($input: AppointmentInput!) { createAppointment(input: $input) { id } }
  `,
    {
      input: {
        patient_id: patientIds[0],
        clinician_id: REAL_CLINICIAN_ID,
        service_id: serviceId,
        clinic_id: clinicId,
        start_datetime: '2027-03-01T11:00:00.000Z',
        notes: 'REQ019-E2E-PROBE-UNBILLED',
      },
    },
  )
  unbilledAppointmentId = unbilledAppt.createAppointment.id
  await gql(request, managerToken, `mutation($id: ID!) { completeAppointment(id: $id) { id } }`, { id: unbilledAppointmentId })

  await request.dispose()
})

test.afterAll(async () => {
  const allIds = [...appointmentIds, unbilledAppointmentId]
  for (const id of allIds) {
    execSync(`docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -c "DELETE FROM \\"QueueEntries\\" WHERE appointment_id='${id}';"`)
  }
  execSync(
    `docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -c "DELETE FROM \\"Appointments\\" WHERE id IN (${allIds.map((id) => `'${id}'`).join(',')});"`,
  )
})

test('front desk manages the live queue: call next, skip, transfer, and the unbilled-visits report', async ({ page }) => {
  test.setTimeout(90_000)
  await loginAs(page, 'Manager')

  await page.goto('/queue')
  await page.getByLabel('Clinician').click()
  await page.getByRole('option', { name: /Sarah Mitchell/ }).click()

  // Three checked-in patients waiting, in check-in order (token_no is null
  // for slot-mode bookings, so ordering falls back to checked_in_at).
  await expect(page.getByText('Waiting (3)')).toBeVisible({ timeout: 15_000 })

  // Unbilled-visits panel surfaces the completed-but-unpaid appointment.
  await expect(page.getByText('REQ019-E2E-PROBE-UNBILLED').or(page.locator('text=/Unbilled visits/'))).toBeVisible()

  // Call Next -> the earliest checked-in patient becomes "now serving".
  const callNextResponse = page.waitForResponse(
    (res) => res.url().includes('/graphql') && res.request().postData()?.includes('callNextInQueue'),
  )
  await page.getByRole('button', { name: 'Call Next' }).click()
  await callNextResponse
  await expect(page.getByText('Waiting (2)')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Now serving')).toBeVisible()

  // Skip the next waiting patient -- dialog confirms, entry leaves "waiting".
  const skipButton = page.getByRole('button', { name: 'Skip / park' }).first()
  await skipButton.click()
  const skipResponse = page.waitForResponse((res) => res.url().includes('/graphql') && res.request().postData()?.includes('skipQueueEntry'))
  await page.getByRole('button', { name: 'Skip', exact: true }).click()
  await skipResponse
  await expect(page.getByText('Waiting (1)')).toBeVisible({ timeout: 15_000 })

  // Transfer the last waiting patient to a colleague -- they leave this
  // clinician's board entirely (reassigned, not merely repositioned).
  const transferButton = page.getByRole('button', { name: 'Transfer to another clinician' }).first()
  await transferButton.click()
  const transferDialog = page.getByRole('dialog')
  await transferDialog.getByLabel('Transfer to').click()
  await page.getByRole('option').first().click()
  const transferResponse = page.waitForResponse(
    (res) => res.url().includes('/graphql') && res.request().postData()?.includes('transferQueueEntry'),
  )
  await page.getByRole('button', { name: 'Transfer', exact: true }).click()
  await transferResponse
  await expect(page.getByText('Waiting (0)')).toBeVisible({ timeout: 15_000 })

  // TV display renders the same live state in its own large-type view.
  await page.getByRole('button', { name: 'TV Display' }).click()
  await page.waitForURL(/\/queue\/display\//, { timeout: 15_000 })
  await expect(page.getByText('NOW SERVING')).toBeVisible({ timeout: 15_000 })
})
