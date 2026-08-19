import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// Priority 1 e2e coverage for the `services` backend domain — was
// previously unable to get an e2e spec at all (context/qa-full-inventory.md
// §7): manager/services/index.jsx's old inline GetCatalogData query matched
// neither GraphQL dialect and 400'd on every load. Rewritten to use the
// real services/productCategories contract (same canonical GraphQL
// operations manager/services/create.jsx|edit.jsx already used), and a real
// backend bug found live during that rewrite is now fixed: ServicesService's
// clinicians mapping passed the raw Prisma Clinicians row through instead of
// computing full_name, crashing the whole query with "Cannot return null
// for non-nullable field ServiceClinician.full_name" for any service with a
// linked clinician.
//
// Logged in as Admin (org-less) rather than Manager — "GP Consultation" is
// clinic-less (the same open-questions.md #2 gap already affecting
// manager/products), so it's invisible to an org-scoped manager's query.

test('admin sees real services and can create a new one', async ({ page }) => {
  await loginAs(page, 'Admin')
  await page.goto('/manager/services')

  await expect(page.getByText('Demo mode')).toHaveCount(0)
  await expect(page.getByText('GP Consultation')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('₹499.00')).toBeVisible()

  const name = `E2E Service ${Date.now()}`
  await page.getByRole('button', { name: 'Add Service' }).click()
  await page.getByLabel('Service Name').fill(name)
  await page.getByLabel('Duration (minutes)').fill('15')
  await page.getByLabel('Price (₹)').fill('50')
  await page.getByRole('button', { name: 'Save Service' }).click()

  await expect(page.getByText(name)).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('₹50.00')).toBeVisible()
})
