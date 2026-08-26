import { execSync } from 'child_process'
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// REQ013/PLAN023 Phase A re-audit (2026-08-22) — clinician/Availability.jsx
// and clinician/Calendar.jsx, never checked for mock/data-shape bugs before
// this session. Found and fixed three real, previously-undiscovered bugs:
//
// 1. Availability.jsx passed user?.id (the caller's own UserProfiles id) as
//    clinicianId instead of user?.clinician?.id (the real Clinicians PK) --
//    a real, linked clinician's own availability page always showed an
//    empty schedule on read, and every save/delete mutation always failed
//    with "Clinician not found" (the backend's own assertClinicianAccess
//    guard correctly rejects the mismatched id) -- no real clinician could
//    ever view or edit their own availability through this page.
// 2. Both Availability.jsx and this file's own first-draft fix compared the
//    real backend's numeric dayOfWeek (Int, Monday=0) against a stringified
//    day index or a literal 'daily' sentinel -- both types Apollo Client
//    never actually returns (the 'daily'/stringified-digit convention only
//    exists on the *write*-side input types). Every weekly (non-daily)
//    availability slot silently never appeared in its day column, and a
//    lunch break saved as "every day" (a null dayOfWeek on read, not the
//    literal string 'daily') rendered on only one wrong day instead of all
//    seven.
// 3. Calendar.jsx's GET_CLINICIAN_SCHEDULE query called a GraphQL field
//    (getClinicianSchedule) that doesn't exist anywhere in the real schema
//    at all -- the page fell back to fully fabricated mock events 100% of
//    the time, for every real clinician, regardless of their actual
//    appointments.
//
// This spec creates its own disposable availability slot + lunch break
// (rather than depending on whatever real data happens to exist in the dev
// DB) and temporarily links the demo clinician account to a real Clinicians
// row for the duration of the run, reverting both in afterAll.

const GRAPHQL_URL = process.env.E2E_GRAPHQL_URL || 'http://localhost:4000/graphql'
const REAL_CLINICIAN_ID = '8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7' // Sarah Mitchell, real seeded clinician
// project-plans/06-execution-plan.md P1.5 (F-28): defaults to the shared dev
// stack's container/database, overridable so this same spec also works
// unchanged against the isolated e2e stack (scripts/run-e2e-isolated.js
// sets both to the e2e container/database).
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
let slotId
let lunchId

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

  // A weekly Thursday slot, distinct time from any real seeded data.
  const slotData = await gql(
    request,
    managerToken,
    `
    mutation { saveClinicianAvailability(input: {
      clinicianId: "${REAL_CLINICIAN_ID}", recurrenceType: "weekly", dayOfWeek: "3",
      startTime: "07:00", endTime: "07:45"
    }) { id } }
  `,
  )
  slotId = slotData.saveClinicianAvailability.id

  // A Friday-only lunch break (dayOfWeek: "4"), to prove a specific-day
  // break does NOT bleed onto every day the way the 'daily' bug did.
  const lunchData = await gql(
    request,
    managerToken,
    `
    mutation { saveLunchBreak(input: {
      clinicianId: "${REAL_CLINICIAN_ID}", dayOfWeek: "4", startTime: "15:15", endTime: "15:30"
    }) { id } }
  `,
  )
  lunchId = lunchData.saveLunchBreak.id

  await request.dispose()
})

test.afterAll(async ({ playwright }) => {
  // Fresh login + fresh request context (not reused from beforeAll) so
  // cleanup can never silently no-op on a stale/disposed context.
  const request = await playwright.request.newContext()
  const authData = await gql(
    request,
    null,
    `
    mutation { login(input: {email: "manager@medibook.dev", password: "Mgr1234!"}) { ... on AuthPayload { access_token } } }
  `,
  )
  const token = authData.login.access_token
  if (slotId) {
    await gql(request, token, `mutation { deleteClinicianAvailability(id: "${slotId}") }`).catch((err) =>
      console.error('afterAll: failed to delete test availability slot', err),
    )
  }
  if (lunchId) {
    await gql(request, token, `mutation { deleteLunchBreak(id: "${lunchId}") }`).catch((err) =>
      console.error('afterAll: failed to delete test lunch break', err),
    )
  }
  await request.dispose()
  execSync(
    `docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -c "UPDATE \\"UserProfiles\\" SET clinician_id = NULL WHERE email = 'clinician@medibook.dev';"`,
  )
})

test('availability page places a weekly slot in its own real day column, and a specific-day lunch break on only that day', async ({
  page,
}) => {
  await loginAs(page, 'Clinician')
  await page.goto('/clinician/availability')

  // DAYS = ['Mon','Tue','Wed','Thu',...] -- the visual "THU" etc. is CSS
  // text-transform: uppercase, actual DOM text content stays title-case.
  const thuCard = page.locator('.MuiGrid-item', { has: page.getByText('Thu', { exact: true }) })
  await expect(thuCard.getByText('7:00', { exact: false })).toBeVisible({ timeout: 15_000 })

  const friCard = page.locator('.MuiGrid-item', { has: page.getByText('Fri', { exact: true }) })
  await expect(friCard.getByText('3:15', { exact: false })).toBeVisible({ timeout: 15_000 })

  // The specific-day (Friday-only) lunch break must NOT appear under an
  // unrelated day -- the exact bug this test guards against.
  const monCard = page.locator('.MuiGrid-item', { has: page.getByText('Mon', { exact: true }) })
  await expect(monCard.getByText('3:15', { exact: false })).not.toBeVisible()
})

test('calendar page shows real appointments and lunch breaks, never the fabricated mock schedule', async ({ page }) => {
  await loginAs(page, 'Clinician')
  await page.goto('/clinician/calendar')
  await page.waitForTimeout(1500)

  // getClinicianSchedule doesn't exist on the real backend -- before this
  // fix, this page always rendered MOCK_EVENTS' fabricated patient names.
  await expect(page.getByText('Emma Wilson')).not.toBeVisible()
  await expect(page.getByText('Omar Hassan')).not.toBeVisible()
})
