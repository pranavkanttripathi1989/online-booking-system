import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// Priority 1 e2e coverage for the `languages` backend domain — verified real
// via Chrome MCP live inspection (context/qa-full-inventory.md §7). Creates
// a real language via createLanguage then deletes it via deleteLanguage, so
// the run is self-cleaning and repeatable.

test('admin can create and delete a language', async ({ page }) => {
  await loginAs(page, 'Admin')
  await page.goto('/admin/languages')

  await expect(page.getByText('English')).toBeVisible({ timeout: 15_000 })

  // Code must be unique per run too (not just the name) — a prior failed
  // run's dangling row with a hardcoded code would otherwise collide here.
  const suffix = Date.now()
  const name = `E2E Test Lang ${suffix}`
  await page.getByRole('button', { name: 'Add Language' }).click()
  await page.getByLabel('Language Name').fill(name)
  await page.getByLabel('Locale Code').fill(`e2e${suffix}`)
  await page.getByRole('button', { name: 'Create', exact: true }).click()

  const row = page.locator('tr', { hasText: name })
  await expect(row).toBeVisible({ timeout: 15_000 })

  // The row has two action buttons: "Edit" (named) and an icon-only delete
  // button rendered after it — click the last button in the row.
  await row.locator('button').last().click()

  // Confirm dialog, if the delete action opens one, before the row disappears.
  const confirmButton = page.getByRole('button', { name: /delete/i }).last()
  if (await confirmButton.isVisible().catch(() => false)) {
    await confirmButton.click()
  }
  await expect(page.getByText(name)).toHaveCount(0, { timeout: 15_000 })
})
