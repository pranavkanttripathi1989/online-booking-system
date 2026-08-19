import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// Priority 1 e2e coverage for the `test-results` backend domain — verified
// real via Chrome MCP live inspection (context/qa-full-inventory.md §7).

test('manager sees a real seeded test result', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/test-results')

  await expect(page.getByText('Priya Sharma')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Blood Test').first()).toBeVisible()
})
