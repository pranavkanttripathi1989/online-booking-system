import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// Priority 1 e2e coverage for the `reviews` backend domain — verified real
// via Chrome MCP live inspection (context/qa-full-inventory.md §7): a
// genuine empty state from the real findAll query, since no createReview
// path exists anywhere in the backend yet (reviews.service.spec.ts notes
// the same). This confirms the page reaches the real resolver rather than
// silently rendering stale/mock reviews.

test('admin sees the real (currently empty) reviews list, not mock data', async ({ page }) => {
  await loginAs(page, 'Admin')
  await page.goto('/reviews')

  await expect(page.getByText('No reviews found')).toBeVisible({ timeout: 15_000 })
})
