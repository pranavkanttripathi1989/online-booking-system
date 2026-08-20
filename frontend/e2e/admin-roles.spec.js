import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// Smoke test for the Custom Roles & Access Groups feature
// (context/phase1-frontend-missing-features-implementation-plan.md Feature #1).
// Now real (backend/src/users' roles/getPermissions/createRole/updateRole/
// deleteRole, wired up off mocks/store.js this session) — a fixed role name
// here would collide on the real (client_org_id, name) unique constraint on
// a second real run, same test-pollution bug class already hit and fixed on
// manager-services' price locator and manager-staff's phone number.
//
// Both tests use the shared loginAs() helper rather than the inline
// login+goto this file used to have -- that inline version never waited for
// the post-login redirect, so page.goto('/admin/roles') could fire while
// the LOGIN_MUTATION was still in flight. Chromium cancels the in-flight
// request on a hard navigation, which the client's error handling treated
// identically to a real backend-offline timeout, silently dropping the
// session onto the mock-auth fallback path -- invisible while this page was
// 100% mock, now a real, reproducible failure since real queries reject a
// mock token. See helpers.js's own comment for the same race, documented
// there for exactly this reason.

test('admin can create a custom role with permissions', async ({ page }) => {
  await loginAs(page, 'Admin')

  await page.goto('/admin/roles')
  await expect(page.getByText('Role Management')).toBeVisible()

  const name = `E2E Test Role ${Date.now()}`
  await page.getByRole('button', { name: 'Add Role' }).first().click()
  await page.locator('input[name="name"]').fill(name)
  await page.getByLabel('Grant appointments — view').check()

  await page.getByRole('button', { name: 'Create', exact: true }).click()

  await expect(page.getByText('Role created.')).toBeVisible()
  await expect(page.getByText(name)).toBeVisible()
})

test('system roles cannot be deleted', async ({ page }) => {
  await loginAs(page, 'Admin')

  await page.goto('/admin/roles')
  // exact: true — the seeded system role's own description is literally
  // "super_admin role", so a substring match hits both the role name and
  // its description.
  await expect(page.getByText('super_admin', { exact: true })).toBeVisible()

  // System roles show no delete icon at all — only edit.
  const superAdminCard = page.locator('.MuiCard-root').filter({ has: page.getByText('super_admin', { exact: true }) })
  await expect(superAdminCard.getByLabel(/Delete super_admin role/)).toHaveCount(0)
})
