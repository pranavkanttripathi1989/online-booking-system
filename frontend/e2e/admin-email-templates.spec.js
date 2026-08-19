import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// Priority 1 e2e coverage for the `email-templates` backend domain —
// verified real via Chrome MCP live inspection (context/qa-full-inventory.md
// §7): a full edit round-trip against the real updateEmailTemplate mutation,
// reverted back to its original value so seed data stays clean.

test('admin can edit a real email template subject and see it persist', async ({ page }) => {
  await loginAs(page, 'Admin')
  await page.goto('/admin/email-templates')

  const original = 'Appointment Cancelled — {{patient_name}}'
  const modified = 'Appointment Cancelled — {{patient_name}} (e2e verified)'

  // The subject renders as a raw text node sharing a <p> with a "Subject:"
  // <strong>, not its own isolated element — exact:true can never match it,
  // since Playwright's exact match is against an element's full text content.
  await expect(page.getByText(original)).toBeVisible({ timeout: 15_000 })

  await page.getByRole('button', { name: 'Edit' }).first().click()
  const subjectField = page.getByLabel('Subject')
  await subjectField.fill(modified)
  await expect(subjectField).toHaveValue(modified)
  await page.getByRole('button', { name: 'Save Template' }).click()

  await expect(page.getByText(modified)).toBeVisible({ timeout: 15_000 })

  // Revert so the seeded template is left unchanged for other tests/runs.
  await page.getByRole('button', { name: 'Edit' }).first().click()
  const revertField = page.getByLabel('Subject')
  await revertField.fill(original)
  await expect(revertField).toHaveValue(original)
  await page.getByRole('button', { name: 'Save Template' }).click()
  await expect(page.getByText(original)).toBeVisible({ timeout: 15_000 })
})
