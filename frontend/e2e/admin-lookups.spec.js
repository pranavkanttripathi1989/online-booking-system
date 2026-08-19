import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// Priority 1 e2e coverage for the `lookups` backend domain (ClinicianType /
// RoomType) — verified real via Chrome MCP live inspection
// (context/qa-full-inventory.md §7).

test('admin sees real seeded clinician types', async ({ page }) => {
  await loginAs(page, 'Admin')
  await page.goto('/admin/clinician-types')

  await expect(page.getByText('Cardiologist')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('General Physician')).toBeVisible()
})

test('admin can create and delete a room type', async ({ page }) => {
  await loginAs(page, 'Admin')
  await page.goto('/admin/room-types')

  await expect(page.getByText('Consultation Room')).toBeVisible({ timeout: 15_000 })

  const name = `E2E Room Type ${Date.now()}`
  await page.getByRole('button', { name: 'Add Room Type' }).click()
  await page.getByLabel('Name').fill(name)
  await page.getByRole('button', { name: 'Create', exact: true }).click()

  const row = page.locator('tr', { hasText: name })
  await expect(row).toBeVisible({ timeout: 15_000 })

  await row.getByRole('button', { name: 'Delete' }).click()
  const confirmButton = page.getByRole('button', { name: /delete/i }).last()
  if (await confirmButton.isVisible().catch(() => false)) {
    await confirmButton.click()
  }
  await expect(page.getByText(name)).toHaveCount(0, { timeout: 15_000 })
})
