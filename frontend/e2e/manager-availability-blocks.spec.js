import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// Priority 1 e2e coverage for the `availability` and `blocks` backend
// domains — both verified real via Chrome MCP live inspection
// (context/qa-full-inventory.md §7).

test('manager sees real seeded clinician availability', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/manager/availability')

  // Two seeded availability rows both belong to Sarah Mitchell.
  await expect(page.getByText('Mitchell').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('MG Road Clinic').first()).toBeVisible()
})

test('manager sees real seeded spacer blocks', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/manager/blocks')

  await expect(page.getByText('Mitchell').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('prep time')).toBeVisible()
})
