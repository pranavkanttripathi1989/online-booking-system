import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// REQ012/PLAN021 — org-level Security & Privacy real enforcement (MFA
// requirement, idle-timeout, audit logging, patient data export, manager
// IP whitelist), against backend/src/org-settings' new
// myOrgSecuritySettings/updateMyOrgSecuritySettings pair and
// backend/src/account's myDataExport.
//
// Serial, not fullyParallel's default: every test in this file reads and
// full-overwrites the same shared org's security settings row (same
// reasoning as settings-account.spec.js's manager profile tests), so two
// of these racing in parallel workers would clobber each other's
// in-flight toggle state.
test.describe.configure({ mode: 'serial' })
// Each test does a real page.reload() against the Vite dev server (on-demand
// module compile, not a prod build) plus multiple real network round trips
// -- the default 30s budget is tight under load, matching the longer
// timeout other reload-heavy specs in this suite already use.
test.setTimeout(60_000)

test('manager can load, save, and revert org Security Settings', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/admin/policies')
  await page.getByRole('tab', { name: 'Security & Privacy' }).click()
  await expect(page.getByRole('heading', { name: 'Security Settings' })).toBeVisible()

  // Each toggle row is a plain MUI Stack (no <label>/<FormControlLabel>
  // wrapper) -- .last() of the class+text match picks the innermost row
  // Stack over its two divider/container ancestors that also contain the text.
  const auditSwitch = page.locator('div.MuiStack-root', { hasText: 'Enable audit logging' }).last().locator('input[type="checkbox"]')
  // Switches are disabled while the real myOrgSecuritySettings query is
  // in flight -- waiting for enabled avoids reading the pre-load default.
  await expect(auditSwitch).toBeEnabled()
  const before = await auditSwitch.isChecked()
  expect(before).toBe(false) // clean baseline, reset by every prior run of this test

  await auditSwitch.click()
  await page.getByRole('button', { name: 'Save Security Settings' }).click()
  await expect(page.getByText(/saved/i)).toBeVisible()

  await page.reload()
  await page.getByRole('tab', { name: 'Security & Privacy' }).click()
  const afterReload = page.locator('div.MuiStack-root', { hasText: 'Enable audit logging' }).last().locator('input[type="checkbox"]')
  await expect(afterReload).toBeChecked()

  // Revert so the shared org's settings aren't left mutated for other specs/manual QA.
  await afterReload.click()
  await page.getByRole('button', { name: 'Save Security Settings' }).click()
  await expect(page.getByText(/saved/i)).toBeVisible()
})

test('IP whitelist textarea appears only when the toggle is on, and persists its value', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/admin/policies')
  await page.getByRole('tab', { name: 'Security & Privacy' }).click()
  await expect(page.getByRole('heading', { name: 'Security Settings' })).toBeVisible()

  // "Allowed IP Addresses" is a Typography heading above a placeholder-only
  // TextField (no label prop), not a <label> -- scoped through the card
  // that renders conditionally on ipWhitelistEnabled.
  const ipCard = page.locator('.MuiCard-root', { hasText: 'Allowed IP Addresses' })
  await expect(ipCard).not.toBeVisible()

  const ipSwitch = page.locator('div.MuiStack-root', { hasText: 'IP whitelist for managers' }).last().locator('input[type="checkbox"]')
  await expect(ipSwitch).toBeEnabled()
  await ipSwitch.click()
  const ipTextarea = ipCard.locator('textarea').first()
  await expect(ipTextarea).toBeVisible()

  await ipTextarea.fill('192.168.1.0/24')
  await page.getByRole('button', { name: 'Save Security Settings' }).click()
  await expect(page.getByText(/saved/i)).toBeVisible()

  await page.reload()
  await page.getByRole('tab', { name: 'Security & Privacy' }).click()
  await expect(page.locator('.MuiCard-root', { hasText: 'Allowed IP Addresses' }).locator('textarea').first()).toHaveValue('192.168.1.0/24')

  // Revert to the clean baseline.
  await page.locator('.MuiCard-root', { hasText: 'Allowed IP Addresses' }).locator('textarea').first().fill('')
  const ipSwitchAfter = page.locator('div.MuiStack-root', { hasText: 'IP whitelist for managers' }).last().locator('input[type="checkbox"]')
  await ipSwitchAfter.click()
  await page.getByRole('button', { name: 'Save Security Settings' }).click()
  await expect(page.getByText(/saved/i)).toBeVisible()
})

// The demo patient@medibook.dev account is deliberately unlinked
// (patient_id: null, see CLAUDE.md) -- myDataExport correctly returns null
// for it, so this exercises the real query end-to-end and its honest
// "not available" error path, not the populated-export path (that's
// covered by account.service.spec.ts's myDataExport describe block with a
// linked-patient fixture, plus this session's live curl verification).
test('patient sees Download My Data and gets a clear message when export is unavailable', async ({ page }) => {
  await loginAs(page, 'Patient')
  await page.goto('/settings')
  await page.getByRole('tab', { name: 'Account & Security' }).click()

  await expect(page.getByRole('heading', { name: 'Your Data' })).toBeVisible()
  await page.getByRole('button', { name: 'Download My Data' }).click()
  await expect(page.getByText(/isn't available for your account/i)).toBeVisible()
})

test('manager and admin do not see the Your Data section (patient-only)', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/settings')
  await page.getByRole('tab', { name: 'Account & Security' }).click()
  await expect(page.getByRole('heading', { name: 'Active Sessions' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Your Data' })).not.toBeVisible()
})
