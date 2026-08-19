import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// Priority 1 e2e coverage for the `appointments` backend domain — verified
// real via Chrome MCP live inspection (context/qa-full-inventory.md §7):
// real seeded appointments render on the "All" tab (the "Upcoming" tab is
// legitimately empty for the seed data's dates relative to "today").

test('manager sees real seeded appointments', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/appointments')

  await page.getByRole('tab', { name: 'All' }).click()
  await expect(page.getByText('Anita Sharma')).toBeVisible({ timeout: 15_000 })
  // Sarah Mitchell is the clinician on every seeded appointment row.
  await expect(page.getByText('Sarah Mitchell').first()).toBeVisible()
})
