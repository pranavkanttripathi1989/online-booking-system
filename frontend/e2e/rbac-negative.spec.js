import { execSync } from 'child_process'
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// F-27 (project-plans/02-findings-register.md) — this codebase's e2e suite
// was smoke-weighted (73% toBeVisible assertions) with no negative-RBAC
// coverage at all: no spec proved a caller WITHOUT a role is actually
// rejected, only that a caller WITH one sees the right content. Two real
// scenarios, matching the finding's own text exactly.

const GRAPHQL_URL = process.env.E2E_GRAPHQL_URL || 'http://localhost:4000/graphql'
const DB_CONTAINER = process.env.E2E_DB_CONTAINER || 'medibook_postgres'
const DB_NAME = process.env.E2E_DB_NAME || 'medibook_db'

function psql(sql) {
  return execSync(`docker exec ${DB_CONTAINER} psql -U medibook -d ${DB_NAME} -t -A -c "${sql.replace(/"/g, '\\"')}"`)
    .toString()
    .trim()
}

async function gql(request, token, query, variables) {
  const res = await request.post(GRAPHQL_URL, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    data: { query, variables },
  })
  return res.json()
}

async function login(request, email, password) {
  const body = await gql(
    request,
    undefined,
    `mutation Login($input: LoginInput!) { login(input: $input) { ... on AuthPayload { access_token } } }`,
    { input: { email, password } },
  )
  return body.data.login.access_token
}

test.describe.configure({ mode: 'serial' })

test.describe('Negative RBAC — a caller without a role is actually rejected', () => {
  // Scenario 1: a patient hitting an admin-only route sees the app's own
  // 403 page, not the page content underneath.
  test('a patient session hitting /admin/users gets Forbidden403, not the user directory', async ({ page }) => {
    await loginAs(page, 'Patient')
    await page.goto('/admin/users')
    await expect(page.getByText('403', { exact: true })).toBeVisible()
    await expect(page.getByText('Access Forbidden')).toBeVisible()
    await expect(page.getByRole('table')).not.toBeVisible()
  })

  test('a patient session hitting /admin/roles gets Forbidden403, not the role list', async ({ page }) => {
    await loginAs(page, 'Patient')
    await page.goto('/admin/roles')
    await expect(page.getByText('403', { exact: true })).toBeVisible()
    await expect(page.getByText('Access Forbidden')).toBeVisible()
  })

  // Scenario 2: a manager in org A reading a real patient that belongs to
  // a different org gets a not-found response, not the record. Verified
  // directly over the real GraphQL endpoint (not a page click) so the
  // assertion is about the backend's own tenant boundary (F-04's fix), not
  // entangled with patients/detail.jsx's own separate, documented partial
  // mock-data state for unrelated tabs on that page.
  test('a manager cannot read a real patient belonging to a different org', async ({ request }) => {
    const otherOrgId = psql(`SELECT id FROM "ClientOrganizations" WHERE id != '3efd3018-9760-4d10-92c0-86981799240b' LIMIT 1;`)
    expect(otherOrgId).toBeTruthy()

    // `psql -t -A` on an INSERT ... RETURNING prints the id AND a second
    // "INSERT 0 1" status line — psql()'s own .trim() only strips
    // leading/trailing whitespace, not that second line, so the raw
    // result is NOT just the id. Take the first line explicitly.
    const patientId = psql(
      `INSERT INTO "Patients" (id, client_org_id, first_name, last_name, date_of_birth, email, phone, address, updated_at)
       VALUES (gen_random_uuid(), '${otherOrgId}', 'E2E', 'CrossOrgPatient', '1990-01-01', 'e2e-crossorg-${Date.now()}@medibook.dev', '+919800000099', '1 Test Road', now())
       RETURNING id;`,
    )
      .split('\n')[0]
      .trim()

    try {
      const token = await login(request, 'manager@medibook.dev', 'Mgr1234!')
      const body = await gql(request, token, `query P($id: ID!) { patient(id: $id) { id first_name } }`, { id: patientId })
      // isSameOrg()'s own fail-closed convention: not-found, never a
      // partial/forbidden response that would confirm the record exists.
      expect(body.data?.patient ?? null).toBeNull()
    } finally {
      psql(`DELETE FROM "Patients" WHERE id = '${patientId}';`)
    }
  })
})
