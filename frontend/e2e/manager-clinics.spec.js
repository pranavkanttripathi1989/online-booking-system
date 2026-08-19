import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// Priority 1 e2e coverage for the `clinics` backend domain — verified real
// (not mock) via Chrome MCP live inspection before writing this
// (context/qa-full-inventory.md §7): manager/clinics.jsx renders real
// seeded clinics through ClinicsService.findAll, org-scoped by the JWT.

test('manager sees real seeded clinics and can filter them by search', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/manager/clinics')

  await expect(page.getByText('MG Road Clinic')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Koramangala Health Center')).toBeVisible()

  await page.getByPlaceholder('Search clinics...').fill('MG Road')
  await expect(page.getByText('MG Road Clinic')).toBeVisible()
  await expect(page.getByText('Koramangala Health Center')).toHaveCount(0)
})
