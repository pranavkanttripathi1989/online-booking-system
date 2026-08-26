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
// Same reasoning as security-privacy.spec.js (TR049) — this file's several
// real page.reload()s each hit the Vite dev server's on-demand compile plus
// a real network round trip; the default 30s per-test timeout is tight for
// that under normal host load and was observed to time out under heavier load.
test.setTimeout(90_000)

// .fill()'s single native-setter + one 'input' event has been observed,
// under this file's real host/network round trips, to occasionally not
// register with React at all (not merely slow — a value that never commits
// even given many seconds) on whichever field happens to lose the race that
// run, not one specific field. Real key-by-key events plus an immediate
// post-fill verification turns a dropped event into an obvious, actionable
// failure right where it happened, instead of a save that silently omits
// real user input three steps later.
async function fillAndVerify(locator, value) {
  await locator.fill('')
  await locator.pressSequentially(value, { delay: 10 })
  await expect(locator).toHaveValue(value, { timeout: 10_000 })
}

// input[type="date"] doesn't take literal keystrokes the way a text input
// does -- a native date input's segmented (day/month/year) editing model
// ignores a typed "-" and free-form digit sequence, so pressSequentially
// isn't usable here the way it is for text/textarea fields. .fill() already
// has Playwright's own special-cased, reliable handling for date inputs;
// this only adds the same post-fill commit verification fillAndVerify uses
// elsewhere in this file.
async function fillDateAndVerify(locator, value) {
  await locator.fill(value)
  await expect(locator).toHaveValue(value, { timeout: 10_000 })
}

test('profile tab loads real data, saves an edit, and reverts it', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/settings')

  // Real myProfile data, not the old hardcoded '+1 555-000-1234' placeholder.
  await expect(page.getByLabel('First Name')).toHaveValue('Sarah')

  await fillAndVerify(page.getByLabel('First Name'), 'Sarah E2E')
  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect(page.getByText('Profile changes saved successfully!')).toBeVisible()

  await page.reload()
  // A higher-than-default per-assertion timeout: under this file's observed
  // host load, the post-reload myProfile query has occasionally still been
  // in flight past the default 5s expect() poll window even though the
  // overall test.setTimeout(90s) above leaves plenty of budget left.
  await expect(page.getByLabel('First Name')).toHaveValue('Sarah E2E', { timeout: 20_000 })

  // Revert so the shared manager account's name isn't left mutated.
  await fillAndVerify(page.getByLabel('First Name'), 'Sarah')
  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect(page.getByText('Profile changes saved successfully!')).toBeVisible()
})

// PLAN016 Slice A (REQ005) — DOB/Gender/Bio/structured address, extending
// the profile-tab test above. Reverted at the end for the same reason.
test('profile tab saves DOB, gender, bio, and address, and reverts them', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/settings')

  await fillDateAndVerify(page.locator('input[type="date"]'), '1985-04-12')
  await fillAndVerify(page.getByLabel('Bio / About'), 'E2E test bio')
  await fillAndVerify(page.getByLabel('Address line 1'), '12 MG Road')
  await fillAndVerify(page.getByLabel('City'), 'Bengaluru')
  await fillAndVerify(page.getByLabel('State'), 'Karnataka')
  await fillAndVerify(page.getByLabel('PIN Code'), '560001')
  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect(page.getByText('Profile changes saved successfully!')).toBeVisible()

  await page.reload()
  // Same reasoning as the profile-name test above — give the post-reload
  // myProfile query more than the default 5s expect() window.
  await expect(page.locator('input[type="date"]')).toHaveValue('1985-04-12', { timeout: 20_000 })
  await expect(page.getByLabel('Bio / About')).toHaveValue('E2E test bio', { timeout: 20_000 })
  await expect(page.getByLabel('City')).toHaveValue('Bengaluru', { timeout: 20_000 })

  // Revert so the shared manager account isn't left mutated for other specs.
  await fillDateAndVerify(page.locator('input[type="date"]'), '')
  await fillAndVerify(page.getByLabel('Bio / About'), '')
  await fillAndVerify(page.getByLabel('Address line 1'), '')
  await fillAndVerify(page.getByLabel('City'), '')
  await fillAndVerify(page.getByLabel('State'), '')
  await fillAndVerify(page.getByLabel('PIN Code'), '')
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
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  await page.locator('input[type="file"]').setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from(pngBase64, 'base64'),
  })
  await expect(page.getByText('Photo saved successfully!')).toBeVisible({ timeout: 10_000 })

  await page.reload()
  await expect(page.locator('img[src*="/uploads/avatars/"]')).toBeVisible({ timeout: 15_000 })
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
