import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// REQ005 (Settings) — Profile, Sessions, Notification Preferences against
// the real backend/src/account and backend/src/notification-preferences
// modules. Password change and account deactivation are exercised via
// direct GraphQL calls (see test-results/settings/requirement/TR039-...md)
// rather than here, to avoid mutating the shared manager@medibook.dev
// credentials other e2e specs rely on. Profile-tab edits here are reverted
// within the same test for the same reason.
//
// Serial, not fullyParallel's default: every test in this file reads and
// full-overwrites the same shared manager@medibook.dev UserProfiles row
// (updateMyProfile always sends the whole profile, not a partial patch),
// so two of these tests racing in parallel workers clobber each other's
// in-flight edits -- confirmed as the actual cause of an intermittent
// "First Name" reverting to empty when this file ran with 2 workers.
test.describe.configure({ mode: 'serial' })

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

// PLAN016 Slice A (REQ005) — DOB/Gender/Bio/structured address, extending
// the profile-tab test above. Reverted at the end for the same reason.
test('profile tab saves DOB, gender, bio, and address, and reverts them', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/settings')

  await page.locator('input[type="date"]').fill('1985-04-12')
  await page.getByLabel('Bio / About').fill('E2E test bio')
  await page.getByLabel('Address line 1').fill('12 MG Road')
  await page.getByLabel('City').fill('Bengaluru')
  await page.getByLabel('State').fill('Karnataka')
  await page.getByLabel('PIN Code').fill('560001')
  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect(page.getByText('Profile changes saved successfully!')).toBeVisible()

  await page.reload()
  await expect(page.locator('input[type="date"]')).toHaveValue('1985-04-12')
  await expect(page.getByLabel('Bio / About')).toHaveValue('E2E test bio')
  await expect(page.getByLabel('City')).toHaveValue('Bengaluru')

  // Revert so the shared manager account isn't left mutated for other specs.
  await page.locator('input[type="date"]').fill('')
  await page.getByLabel('Bio / About').fill('')
  await page.getByLabel('Address line 1').fill('')
  await page.getByLabel('City').fill('')
  await page.getByLabel('State').fill('')
  await page.getByLabel('PIN Code').fill('')
  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect(page.getByText('Profile changes saved successfully!')).toBeVisible()
})

// PLAN016 Slice B (REQ005) — real POST /account/avatar upload, not just a
// local object-URL preview.
// No "remove avatar" mutation/UI exists to revert this one -- the shared
// manager account keeps this test's uploaded photo afterward, same
// accepted-debris precedent as manager-services.spec.js's undeleted
// "E2E Service *" row.
test('avatar upload persists a real photo via POST /account/avatar', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/settings')

  // Minimal valid 1x1 red PNG, built inline so the spec has no binary fixture dependency.
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  await page.locator('input[type="file"]').setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from(pngBase64, 'base64'),
  })
  await expect(page.getByText('Photo saved successfully!')).toBeVisible({ timeout: 10_000 })

  await page.reload()
  await expect(page.locator('img[src*="/uploads/avatars/"]')).toBeVisible()
})

test('active sessions tab shows real session data', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/settings')
  await page.getByRole('tab', { name: 'Account & Security' }).click()

  // Not getByText('Active Sessions') -- case-insensitive substring matching
  // also matches "No active sessions." whenever the list happens to be
  // momentarily empty (e.g. right after a Redis flush), a strict-mode
  // violation this scopes around by targeting the heading specifically.
  await expect(page.getByRole('heading', { name: 'Active Sessions' })).toBeVisible()
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
