import { execSync } from 'child_process'
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// BUG021 — clinician/Dashboard.jsx was fabricated end to end: its read
// query targeted the wrong (public, unauthenticated) GraphQL dialect with
// fields that don't exist on the real return type (a guaranteed validation
// error on every request), its `isMock = !data` fallback permanently
// masked that as fully-formed fake sample data, and both write actions
// ("Save Block", "Mark Complete") only ever mutated local React state.
// This spec proves the rebuilt page (PLAN083) actually round-trips through
// the real backend — real appointment data on load, and both write actions
// durably persisted (verified by reloading the page, not just reading
// updated in-memory state).
//
// Same fixture strategy as clinician-portal.spec.js: temporarily link the
// demo clinician@medibook.dev account to the real seeded clinician (Sarah
// Mitchell), reverted in afterAll.

const GRAPHQL_URL = process.env.E2E_GRAPHQL_URL || 'http://localhost:4000/graphql'
const REAL_CLINICIAN_ID = '8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7' // Sarah Mitchell, real seeded clinician
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
let serviceId
let patientId
let appointmentTimeLabel // e.g. "10:47 AM" — the exact label Dashboard.jsx renders for this fixture

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

  const clinicsData = await gql(request, managerToken, `{ clinics { id name } }`)
  clinicId = (clinicsData.clinics.find((c) => c.name === 'MG Road Clinic') ?? clinicsData.clinics[0]).id

  const servicesData = await gql(request, managerToken, `{ services { id name clinicians { id } } }`)
  const svc =
    servicesData.services.find((s) => s.name === 'GP Consultation' && s.clinicians.some((c) => c.id === REAL_CLINICIAN_ID)) ??
    servicesData.services.find((s) => s.clinicians.some((c) => c.id === REAL_CLINICIAN_ID))
  serviceId = svc.id

  const patientData = await gql(
    request,
    managerToken,
    `
    mutation($input: PatientInput!) { createPatient(input: $input) { id } }
  `,
    {
      input: {
        first_name: 'E2E',
        last_name: 'ClinicianDash',
        email: `e2e.cliniciandash.${Date.now()}@example.com`,
        phone: `9${Date.now().toString().slice(-9)}`,
        date_of_birth: '1990-01-01',
      },
    },
  )
  patientId = patientData.createPatient.id

  // Cancel any still-scheduled residue from a previous interrupted run
  // (this suite doesn't clean up its own appointment fixture on a normal
  // pass either, matching this codebase's established e2e residue
  // convention — but a *scheduled* leftover, unlike a cancelled one, both
  // blocks the real Postgres slot-conflict EXCLUDE constraint and makes the
  // "which card is this test's own fixture" timeline locator ambiguous).
  // Spans yesterday+today UTC to also catch a leftover from the exact
  // UTC/IST boundary mismatch this file's own `start` calculation avoids.
  const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10)
  const todayUtc = new Date().toISOString().slice(0, 10)
  const existing = await gql(
    request,
    managerToken,
    `
    query($d1: String!, $d2: String!) { appointments(filters: {date_from: $d1, date_to: $d2, clinician_id: "${REAL_CLINICIAN_ID}"}, first: 200) { data { id status patient { full_name } } } }
  `,
    { d1: yesterday, d2: todayUtc },
  )
  const staleIds = existing.appointments.data
    .filter((a) => a.patient.full_name === 'E2E ClinicianDash' && a.status !== 'cancelled')
    .map((a) => a.id)
  for (const id of staleIds) {
    await gql(request, managerToken, `mutation($id: ID!) { cancelAppointment(id: $id, reason: "e2e stale fixture cleanup") { id } }`, {
      id,
    })
  }

  // A time "today" — anchored to the real current instant and offset
  // backward by 1-4 hours, not to a fixed local clock hour. A fixed-hour
  // local Date#setHours + toISOString() is timezone-ambiguous: this host's
  // IST-to-UTC offset (+5:30) means an early-morning IST hour can convert
  // to the *previous* UTC calendar day, silently missing the backend's
  // date_from/date_to (UTC-bounded) "today" filter and, worse, colliding
  // with unrelated real seeded appointments on that other day instead of
  // erroring loudly — the same open-questions.md #15 UTC/IST boundary class
  // already documented in this codebase. Anchoring to "now minus a few
  // hours" is unambiguous: both the backend's UTC "today" and the browser's
  // local "today" agree on it whenever the test runs comfortably after
  // local midnight, and it naturally avoids the real seeded daytime
  // schedule (including Anita Sharma's fixed 11:00 UTC slot).
  const start = new Date(Date.now() - (1 + Math.random() * 3) * 3600 * 1000)
  await gql(
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
        start_datetime: start.toISOString(),
      },
    },
  )
  // Matches Dashboard.jsx's own dayjs(...).format('h:mm A') exactly, so the
  // Mark Complete test can target this fixture's own card unambiguously
  // even alongside same-named cancelled residue from an earlier run.
  appointmentTimeLabel = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

  await request.dispose()
})

test.afterAll(async ({ playwright }) => {
  const request = await playwright.request.newContext()
  await request.dispose()
  execSync(
    `docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -c "UPDATE \\"UserProfiles\\" SET clinician_id = NULL WHERE email = 'clinician@medibook.dev';"`,
  )
})

test("dashboard shows real today's appointment data, never the fabricated mock schedule", async ({ page }) => {
  await loginAs(page, 'Clinician')
  await page.goto('/clinician/dashboard')

  // .first(): the timeline shows every real appointment for today including
  // cancelled ones from this same suite's own prior-run residue, which can
  // share the fixture patient's name — not a page bug, just a real dataset
  // with more than one matching row now.
  await expect(page.getByText('E2E ClinicianDash').first()).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText('Emma Wilson')).not.toBeVisible()
  await expect(page.getByText('Lily Chen')).not.toBeVisible()
  await expect(page.getByText(/Offline.*demo data/)).not.toBeVisible()
  await expect(page.getByText('Dr. Sarah Mitchell')).toBeVisible()
})

test('Add Block saves a real, persisted spacer block (survives a reload)', async ({ page }) => {
  // Unique per-run label -- a previous interrupted run's own real, still-
  // persisted block (this suite never deletes spacer-block fixtures,
  // matching this codebase's own established e2e residue convention) would
  // otherwise collide with a fixed literal and break a strict single-match
  // assertion.
  const blockReason = `E2E BUG021 block ${Date.now()}`

  await loginAs(page, 'Clinician')
  await page.goto('/clinician/dashboard')
  await expect(page.getByText('E2E ClinicianDash').first()).toBeVisible({ timeout: 20_000 })

  await page.getByRole('button', { name: 'Add Block' }).click()
  await page.getByLabel('Start Time').fill('04:00')
  await page.getByLabel('End Time').fill('04:15')
  await page.getByLabel('Reason (optional)').fill(blockReason)
  await page.getByRole('button', { name: 'Save Block' }).click()

  await expect(page.getByText(/added to schedule/)).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(blockReason, { exact: false })).toBeVisible()

  // Reload — a locally-merged fake block would vanish here; a real,
  // persisted one (via createSpacerBlock) survives.
  await page.reload()
  await expect(page.getByText('E2E ClinicianDash').first()).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText(blockReason, { exact: false })).toBeVisible({ timeout: 15_000 })
})

test('Mark Complete persists the real appointment status (survives a reload)', async ({ page }) => {
  await loginAs(page, 'Clinician')
  await page.goto('/clinician/dashboard')

  // The timeline appointment card sits inside its own absolutely-positioned,
  // independently-scrollable container beneath a position:fixed AppBar —
  // Playwright's actionability check treats the AppBar's (invisible-at-this-
  // point, but DOM-present) toolbar as intercepting the click even after the
  // card is scrolled into its own container's view. The card's real
  // visibility/position is already confirmed correct here (a fabricated-data
  // page would never have rendered this exact card at all — the point of
  // this whole spec) so `force: true` is the right call, not a workaround
  // for an actual bug.
  // Filtered on the patient name AND this fixture's own exact rendered time
  // label (beforeAll cancels any scheduled same-named residue up front, but
  // a same-named *cancelled* card from an earlier run still renders on the
  // timeline unfiltered by status — the time label disambiguates it from
  // this test's own fixture regardless).
  const apptCard = page.locator('.MuiCard-root', { hasText: 'E2E ClinicianDash' }).filter({ hasText: appointmentTimeLabel }).first()
  await apptCard.scrollIntoViewIfNeeded()
  await apptCard.click({ force: true })
  await expect(page.getByRole('heading', { name: 'Appointment Details' })).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: /Mark Complete/ }).click()
  await expect(page.getByText('Appointment marked as complete.')).toBeVisible({ timeout: 15_000 })

  // Reload — a local-only status override would vanish here; the real
  // completeAppointment mutation persists it.
  await page.reload()
  await expect(page.getByText('E2E ClinicianDash').first()).toBeVisible({ timeout: 20_000 })
  const apptCardAfterReload = page
    .locator('.MuiCard-root', { hasText: 'E2E ClinicianDash' })
    .filter({ hasText: appointmentTimeLabel })
    .first()
  await apptCardAfterReload.scrollIntoViewIfNeeded()
  await apptCardAfterReload.click({ force: true })
  await expect(page.getByText('COMPLETED', { exact: true })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('button', { name: /Mark Complete/ })).not.toBeVisible()
})
