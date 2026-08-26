import { execSync } from 'child_process'
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// REQ018 — patient dedup + merge (US-BOOK-01) and family/dependant profiles
// (US-BOOK-02), P0 slice. Three independent flows against the real dev
// stack: (1) the "possible duplicate" prompt on patient creation, (2) the
// staff-facing merge tool on the patients list (previously gated on
// `useMock` and so unreachable against real data at all — see PLAN059),
// and (3) a patient adding and seeing their own dependant.
//
// Same fixture-linking discipline as prescription-builder.spec.js: the
// seeded `patient@medibook.dev` account has no linked patient_id by
// default (CLAUDE.md's own documented "both demo accounts unlinked" note),
// so it's linked directly via psql for the duration of this spec and
// unlinked again in afterAll.

const GRAPHQL_URL = process.env.E2E_GRAPHQL_URL || 'http://localhost:4000/graphql'
const DB_CONTAINER = process.env.E2E_DB_CONTAINER || 'medibook_postgres'
const DB_NAME = process.env.E2E_DB_NAME || 'medibook_db'
const DEDUP_PHONE = '9999000111'

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
let existingPatientId
let mergePatientAId
let mergePatientBId
let dependantPatientId

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

  const createPatient = (first, last, phone) =>
    gql(
      request,
      managerToken,
      `
    mutation($input: PatientInput!) { createPatient(input: $input) { id } }
  `,
      {
        input: {
          first_name: first,
          last_name: last,
          email: `${first.toLowerCase()}.${Date.now()}@example.com`,
          phone,
          date_of_birth: '1990-01-01',
        },
      },
    )

  const existing = await createPatient('Rohan', 'DedupProbe', DEDUP_PHONE)
  existingPatientId = existing.createPatient.id

  const a = await createPatient('Merge', 'ProbeA', '9999000222')
  const b = await createPatient('Merge', 'ProbeB', '9999000333')
  mergePatientAId = a.createPatient.id
  mergePatientBId = b.createPatient.id

  execSync(
    `docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -c "UPDATE \\"UserProfiles\\" SET patient_id = '${existingPatientId}' WHERE email = 'patient@medibook.dev';"`,
  )

  await request.dispose()
})

test.afterAll(async () => {
  execSync(
    `docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -c "UPDATE \\"UserProfiles\\" SET patient_id = NULL WHERE email = 'patient@medibook.dev';"`,
  )
  if (dependantPatientId) {
    execSync(
      `docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -c "DELETE FROM \\"PatientRelations\\" WHERE related_patient_id='${dependantPatientId}';"`,
    )
    execSync(`docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -c "DELETE FROM \\"Patients\\" WHERE id='${dependantPatientId}';"`)
  }
  // mergePatientBId was soft-deleted (is_deleted=true), not removed by the
  // merge itself — real hard cleanup either way.
  execSync(
    `docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -c "DELETE FROM \\"PatientMerges\\" WHERE surviving_patient_id='${mergePatientAId}' OR merged_patient_id='${mergePatientBId}';"`,
  )
  const ids = [existingPatientId, mergePatientAId, mergePatientBId].filter(Boolean)
  if (ids.length) {
    execSync(
      `docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -c "DELETE FROM \\"Patients\\" WHERE id IN (${ids.map((id) => `'${id}'`).join(',')});"`,
    )
  }
})

test('front desk sees a possible-duplicate prompt before creating a matching patient', async ({ page }) => {
  test.setTimeout(60_000)
  await loginAs(page, 'Manager')
  await page.goto('/patients/new')

  await page.getByLabel('First Name', { exact: false }).fill('Rohan')
  await page.getByLabel('Last Name', { exact: false }).fill('DedupProbe')
  await page.getByLabel('Email', { exact: false }).fill(`rohan.probe.${Date.now()}@example.com`)
  await page.getByLabel('Phone', { exact: false }).fill(DEDUP_PHONE)

  await page.getByRole('button', { name: 'Save Patient' }).click()
  await expect(page.getByText('Possible existing patient found')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Rohan DedupProbe')).toBeVisible()

  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByText('Possible existing patient found')).not.toBeVisible()
})

test('a manager merges two duplicate patients into one, and the merge is real (not a mock simulation)', async ({ page }) => {
  test.setTimeout(60_000)
  await loginAs(page, 'Manager')
  await page.goto('/patients')
  // "Merge" alone: the search is a per-field substring match
  // (first_name/last_name/email/phone independently), not a full-name
  // concatenation — "Merge Probe" would match neither "Merge" nor "ProbeA".
  // Both merge-probe patients share first_name "Merge"; the dedup-probe
  // fixture's own name has no "Merge" substring anywhere, so this stays
  // scoped to just the two rows this test needs.
  await page.getByPlaceholder(/search/i).fill('Merge')
  await expect(page.getByText('Merge ProbeA')).toBeVisible({ timeout: 15_000 })

  await page.getByRole('button', { name: 'Merge Duplicates' }).click()
  // The clickable row itself has role="button" (not "row"), and its
  // checkbox shares the same accessible name -- target the checkbox
  // directly rather than nesting inside a "row" locator that never matches.
  await page.getByRole('checkbox', { name: 'Select Merge ProbeA for merge' }).check()
  await page.getByRole('checkbox', { name: 'Select Merge ProbeB for merge' }).check()
  await page.getByRole('button', { name: 'Review & Merge' }).click()

  await expect(page.getByText('Merge Duplicate Patients')).toBeVisible({ timeout: 15_000 })
  const mergeResponse = page.waitForResponse((res) => res.url().includes('/graphql') && res.request().postData()?.includes('mergePatients'))
  await page.getByRole('button', { name: 'Merge Patients' }).click()
  await mergeResponse
  await expect(page.getByText(/merged into/)).toBeVisible({ timeout: 15_000 })
})

test('a patient adds a dependant and sees them listed under My Family', async ({ page }) => {
  test.setTimeout(60_000)
  await loginAs(page, 'Patient')
  await page.goto('/patient/family')

  await page.getByRole('button', { name: 'Add Dependant' }).click()
  await page.getByLabel('First name').fill('Little')
  await page.getByLabel('Last name').fill('DependantProbe')
  await page.getByLabel('Date of birth').fill('01/01/2018')
  await page.getByLabel('Relationship').click()
  await page.getByRole('option', { name: 'child', exact: true }).click()

  const addResponse = page.waitForResponse((res) => res.url().includes('/graphql') && res.request().postData()?.includes('addDependant'))
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  const addResBody = await (await addResponse).json()
  dependantPatientId = addResBody.data?.addDependant?.patient?.id

  await expect(page.getByText('Little DependantProbe')).toBeVisible({ timeout: 15_000 })
})
