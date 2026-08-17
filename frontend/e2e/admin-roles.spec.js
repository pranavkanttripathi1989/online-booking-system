import { test, expect } from '@playwright/test'

// Smoke test for the Custom Roles & Access Groups feature
// (context/phase1-frontend-missing-features-implementation-plan.md Feature #1).

test('admin can create a custom role with permissions', async ({ page }) => {
  await page.goto('/login')
  await page.locator('button:has-text("Admin")').click()
  await page.locator('button[type="submit"]').click()

  await page.goto('/admin/roles')
  await expect(page.getByText('Role Management')).toBeVisible()

  await page.getByRole('button', { name: 'Add Role' }).first().click()
  await page.locator('input[name="name"]').fill('E2E Test Role')
  await page.getByLabel('Grant appointments — view').check()

  await page.getByRole('button', { name: 'Create', exact: true }).click()

  await expect(page.getByText('Role created.')).toBeVisible()
  await expect(page.getByText('E2E Test Role')).toBeVisible()
})

test('system roles cannot be deleted', async ({ page }) => {
  await page.goto('/login')
  await page.locator('button:has-text("Admin")').click()
  await page.locator('button[type="submit"]').click()

  await page.goto('/admin/roles')
  await expect(page.getByText('super_admin')).toBeVisible()

  // System roles show no delete icon at all — only edit.
  const superAdminCard = page.locator('text=super_admin').locator('..')
  await expect(superAdminCard.getByLabel(/Delete super_admin role/)).toHaveCount(0)
})
