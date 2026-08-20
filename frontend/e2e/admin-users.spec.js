import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// Priority 1 e2e coverage for the `users` backend domain (getUsers,
// getPermissions/getRolePermissions) — verified real via Chrome MCP live
// inspection (context/qa-full-inventory.md §7), including confirming the
// Permissions Matrix tab's GetRBACData query hits the real resolvers this
// session's users.service.spec.ts covers (getUser's tenant-isolation fix
// included).

test('admin sees all real seeded users in the directory', async ({ page }) => {
  await loginAs(page, 'Admin')
  await page.goto('/admin/users')

  // The directory is server-paginated at 8 rows/page, newest-first — with the
  // real backend now carrying real accumulated e2e-created accounts (each
  // real-backend spec run adds real rows), the oldest seeded accounts can
  // fall off the unfiltered first page. Search for each rather than assume
  // default-page visibility, matching how an admin would actually find a
  // specific account in a directory that's grown past one page.
  const search = page.getByPlaceholder('Search by name or email...')
  for (const email of ['manager@medibook.dev', 'clinician@medibook.dev', 'admin@medibook.dev']) {
    await search.fill(email)
    await expect(page.getByText(email)).toBeVisible({ timeout: 15_000 })
  }
})

test('admin can open the real Permissions Matrix for a role', async ({ page }) => {
  await loginAs(page, 'Admin')
  await page.goto('/admin/users')

  const requestPromise = page.waitForResponse(
    (res) => res.url().includes('/graphql') && res.request().postDataJSON()?.operationName === 'GetRBACData',
  )
  await page.getByRole('button', { name: 'Permissions Matrix' }).click()
  const response = await requestPromise
  expect(response.status()).toBe(200)

  await expect(page.getByText('RESOURCE')).toBeVisible({ timeout: 15_000 })
})
