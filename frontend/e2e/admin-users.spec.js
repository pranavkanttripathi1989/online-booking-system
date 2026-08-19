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

  await expect(page.getByText('manager@medibook.dev')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('clinician@medibook.dev')).toBeVisible()
  await expect(page.getByText('admin@medibook.dev')).toBeVisible()
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
