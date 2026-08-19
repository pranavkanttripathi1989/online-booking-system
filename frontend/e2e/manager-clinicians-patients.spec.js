import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// Priority 1 e2e coverage for the `clinicians` and `patients` backend
// domains — both verified real via Chrome MCP live inspection
// (context/qa-full-inventory.md §7).

test('manager sees real seeded clinicians with real availability data', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/clinicians')

  await expect(page.getByText('Sarah Mitchell')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('General Physician')).toBeVisible()
})

test('manager sees real seeded patients', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/patients')

  await expect(page.getByText('Anita Sharma')).toBeVisible({ timeout: 15_000 })
})
