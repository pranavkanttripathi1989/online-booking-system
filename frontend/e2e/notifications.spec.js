import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// Priority 1 e2e coverage for the `notifications` backend domain — verified
// real via Chrome MCP live inspection (context/qa-full-inventory.md §7):
// the standalone /notifications page makes a real GraphQL call and shows a
// genuine empty state, distinct from components/shared/NotificationBell.jsx
// (the header dropdown), which is still on stale mock data — not tested
// here since it isn't the real backend.

test('admin sees the real notifications page (not the mock bell dropdown)', async ({ page }) => {
  await loginAs(page, 'Admin')
  await page.goto('/notifications')

  await expect(page.getByText('No unread notifications')).toBeVisible({ timeout: 15_000 })
})
