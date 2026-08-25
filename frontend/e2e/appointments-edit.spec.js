import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// B-2 (project-plans/08-integration-gap-analysis.md) — this page's own
// clinician/room dropdowns, and (found while reading the file to fix that)
// the appointment fetch itself and the save-mutation's error handling, all
// fell back to fabricated MockStore data or a fake "success" on a genuine
// empty result or a real save failure, instead of gating on a real error
// only. This spec proves the fixed page against the real backend: real
// fetched data (not mock names), and a real edit that survives a reload.

const GRAPHQL_URL = process.env.E2E_GRAPHQL_URL || 'http://localhost:4000/graphql'

async function gql(request, token, query, variables) {
  const res = await request.post(GRAPHQL_URL, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    data: { query, variables },
  })
  const body = await res.json()
  if (body.errors) throw new Error(`GraphQL error: ${JSON.stringify(body.errors)}`)
  return body.data
}

let managerToken
let appointmentId

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext()
  const authData = await gql(request, null, `
    mutation { login(input: {email: "manager@medibook.dev", password: "Mgr1234!"}) { ... on AuthPayload { access_token } } }
  `)
  managerToken = authData.login.access_token

  const clinicsData = await gql(request, managerToken, `{ clinics { id name } }`)
  const clinicId = (clinicsData.clinics.find((c) => c.name === 'MG Road Clinic') ?? clinicsData.clinics[0]).id

  const servicesData = await gql(request, managerToken, `{ services { id name clinicians { id } } }`)
  const svc = servicesData.services.find((s) => s.clinicians.length > 0)

  const patientData = await gql(request, managerToken, `
    mutation($input: PatientInput!) { createPatient(input: $input) { id full_name } }
  `, { input: { first_name: 'E2E', last_name: 'EditAppt', email: `e2e.editappt.${Date.now()}@example.com`, phone: `9${Date.now().toString().slice(-9)}`, date_of_birth: '1990-01-01' } })

  // Far-future, run-unique time so this fixture never collides with the
  // real seeded schedule or a previous run's own leftover appointment.
  const start = new Date(Date.now() + (400 + Math.floor(Math.random() * 400)) * 24 * 3600 * 1000)
  const apptData = await gql(request, managerToken, `
    mutation($input: AppointmentInput!) { createAppointment(input: $input) { id } }
  `, { input: { patient_id: patientData.createPatient.id, clinician_id: svc.clinicians[0].id, service_id: svc.id, clinic_id: clinicId, start_datetime: start.toISOString() } })
  appointmentId = apptData.createAppointment.id

  await request.dispose()
})

test('shows the real fetched appointment, never fabricated mock data', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto(`/appointments/${appointmentId}/edit`)

  await expect(page.getByText('E2E EditAppt').first()).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText('Emma Wilson')).not.toBeVisible()
})

test('a real edit persists after a reload', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto(`/appointments/${appointmentId}/edit`)
  await expect(page.getByText('E2E EditAppt').first()).toBeVisible({ timeout: 20_000 })

  const note = `E2E edit note ${Date.now()}`
  await page.getByLabel('Notes').fill(note)
  await page.getByRole('button', { name: 'Save Changes' }).click()

  // Real save navigates to the appointment detail page on success.
  await page.waitForURL(`**/appointments/${appointmentId}`, { timeout: 15_000 })

  // Reload the edit page — a fake/local-only save would show the old
  // (empty) notes value again; a real one persists the new text.
  await page.goto(`/appointments/${appointmentId}/edit`)
  await expect(page.getByLabel('Notes')).toHaveValue(note, { timeout: 20_000 })
})

test('a genuinely nonexistent appointment id shows a real not-found state', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/appointments/00000000-0000-4000-8000-000000000000/edit')
  await expect(page.getByText('This appointment could not be found.')).toBeVisible({ timeout: 20_000 })
})
