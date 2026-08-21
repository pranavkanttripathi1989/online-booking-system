import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// Both tests write to the same org's single NotificationProviderConfig row
// (keyed by {client_org_id, channel}) -- serial, not fullyParallel's
// default, so they can't race each other's save/reload.
test.describe.configure({ mode: 'serial' })

// PLAN017 (REQ008) — generic multi-provider OTP/SMS configuration, against
// backend/src/notifications' notification-provider-config module. Run as
// Manager, not Admin: admin/super_admin are platform-wide (client_org_id:
// null in the JWT) and correctly rejected by updateMyProviderConfig, which
// this spec also asserts — see admin/Communications.jsx's route comment
// for why /admin/communications itself allows both roles even though only
// an org-scoped manager can actually save here.
// No "remove config" UI exists to revert this -- the shared manager
// account's org keeps this test's saved MSG91 config afterward, same
// accepted-debris precedent as settings-account.spec.js's avatar upload.

test('manager selects a provider, saves real credentials, and they persist after reload', async ({ page }) => {
  test.slow()
  await loginAs(page, 'Manager')
  await page.goto('/admin/communications')
  await page.getByRole('tab', { name: 'Global Settings' }).click()

  await expect(page.getByText('OTP / SMS Provider')).toBeVisible()
  await page.getByRole('combobox').click()
  await page.getByRole('option', { name: 'MSG91' }).click()

  await page.getByLabel('Auth Key').fill('e2e-test-authkey')
  await page.getByLabel('Sender ID').fill('MEDIBK')
  await page.getByLabel('SMS Sender Name').fill('HealthSync')
  await page.getByRole('button', { name: 'Save SMS Provider Settings' }).click()
  await expect(page.getByText('SMS provider settings saved.')).toBeVisible({ timeout: 10_000 })

  await page.reload()
  await page.getByRole('tab', { name: 'Global Settings' }).click()
  await expect(page.getByText('MSG91')).toBeVisible()
  await expect(page.getByText('Credentials configured')).toBeVisible()
  // The secret itself is never re-sent to the client.
  await expect(page.getByLabel('Auth Key')).toHaveValue('')
})

test('rejects saving when a required field is missing, even with another field filled in', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/admin/communications')
  await page.getByRole('tab', { name: 'Global Settings' }).click()

  await page.getByRole('combobox').click()
  await page.getByRole('option', { name: 'Twilio' }).click()
  // Fills one required field so the save isn't treated as an empty
  // "keep existing credentials" payload (see updateMyProviderConfig) --
  // Auth Token and From Number are left blank to trigger real validation.
  await page.getByLabel('Account SID').fill('ACtest123')
  await page.getByRole('button', { name: 'Save SMS Provider Settings' }).click()
  await expect(page.getByText(/Missing required field/)).toBeVisible({ timeout: 10_000 })
})
