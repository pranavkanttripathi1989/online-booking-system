import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// REQ005 (Settings) — Profile, Sessions, Notification Preferences against
// the real backend/src/account and backend/src/notification-preferences
// modules. Password change and account deactivation are exercised via
// direct GraphQL calls (see test-results/settings/requirement/TR039-...md)
// rather than here, to avoid mutating the shared manager@medibook.dev
// credentials other e2e specs rely on. Profile-tab edits here are reverted
// within the same test for the same reason.

test('profile tab loads real data, saves an edit, and reverts it', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/settings')

  // Real myProfile data, not the old hardcoded '+1 555-000-1234' placeholder.
  await expect(page.getByLabel('First Name')).toHaveValue('Sarah')

  await page.getByLabel('First Name').fill('Sarah E2E')
  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect(page.getByText('Profile changes saved successfully!')).toBeVisible()

  await page.reload()
  await expect(page.getByLabel('First Name')).toHaveValue('Sarah E2E')

  // Revert so the shared manager account's name isn't left mutated.
  await page.getByLabel('First Name').fill('Sarah')
  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect(page.getByText('Profile changes saved successfully!')).toBeVisible()
})

test('active sessions tab shows real session data', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/settings')
  await page.getByRole('tab', { name: 'Account & Security' }).click()

  await expect(page.getByText('Active Sessions')).toBeVisible()
  // The session that this very test's login just created shows real device
  // info (a real User-Agent, not the old fake "Chrome on macOS"/"Mumbai, IN" mock).
  await expect(page.getByText(/Unknown device|Mozilla|Chrome|Firefox|Safari|WebKit/).first()).toBeVisible()
})

test('notification preferences load real defaults and persist a toggle', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/settings')
  await page.getByRole('tab', { name: 'Notifications' }).click()

  await expect(page.getByText('New appointment booked')).toBeVisible()
  const row = page.locator('tr', { hasText: 'New message received' })
  const appSwitch = row.locator('td').nth(3).locator('input[type="checkbox"]')
  const before = await appSwitch.isChecked()

  await appSwitch.click()
  await page.getByRole('button', { name: 'Save Preferences' }).click()
  await expect(page.getByText('Notification preferences saved successfully!')).toBeVisible()

  await page.reload()
  await page.getByRole('tab', { name: 'Notifications' }).click()
  const rowAfterReload = page.locator('tr', { hasText: 'New message received' })
  const afterSwitch = rowAfterReload.locator('td').nth(3).locator('input[type="checkbox"]')
  await expect(afterSwitch).toBeChecked({ checked: !before })

  // Revert to leave the shared manager account's preferences unchanged.
  await afterSwitch.click()
  await page.getByRole('button', { name: 'Save Preferences' }).click()
  await expect(page.getByText('Notification preferences saved successfully!')).toBeVisible()
})
