import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// Priority 1 e2e coverage for the `notifications` backend domain — verified
// real via Chrome MCP live inspection (context/qa-full-inventory.md §7):
// the standalone /notifications page makes a real GraphQL call and shows a
// genuine empty state.

test('admin sees the real notifications page', async ({ page }) => {
  await loginAs(page, 'Admin')
  await page.goto('/notifications')

  await expect(page.getByText('No unread notifications')).toBeVisible({ timeout: 15_000 })
})

// Priority 3 mock-removal sweep (2026-08-22) — components/shared/NotificationBell.jsx
// (the AppShell header dropdown) used to run entirely on its own separate
// MockStore.getWidgetNotifications() list with zero real GraphQL call, so
// its unread badge and dropdown were fake for every logged-in user
// regardless of their real notifications. Rewired onto the same real
// backend/src/notifications contract the /notifications page already uses.
test('header notification bell calls the real backend, not a mock list', async ({ page }) => {
  await page.goto('/login')
  const requestPromise = page.waitForResponse(
    (res) => res.url().includes('/graphql') && res.request().postData()?.includes('GetNotificationsForBell'),
    { timeout: 15_000 },
  )
  await page.locator('button:has-text("Admin")').first().click()
  await page.locator('button[type="submit"]').click()
  const response = await requestPromise
  expect(response.ok()).toBe(true)
})
