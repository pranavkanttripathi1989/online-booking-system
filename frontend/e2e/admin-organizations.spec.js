import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// Priority 1 e2e coverage for the `organizations` backend domain — verified
// real via Chrome MCP live inspection (context/qa-full-inventory.md §7).
// Both orgs shown are the two real tenants created by the seed-data
// tenant-linkage fix (qa-full-inventory.md §6).

test('admin sees real seeded organizations', async ({ page }) => {
  await loginAs(page, 'Admin')
  await page.goto('/admin/organizations')

  await expect(page.getByText('City Heart Clinic Group')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Westside Health Group')).toBeVisible()
})
