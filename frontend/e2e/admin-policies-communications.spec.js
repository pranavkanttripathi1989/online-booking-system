import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// REQ006 remainder — admin/Policies.jsx's Booking Policies tab and
// admin/Communications.jsx's Global Settings (email half). Both are
// org-scoped off the caller's own client_org_id (backend/src/org-settings),
// which only a manager (not an org-less admin/super_admin) actually has —
// /admin/policies and /admin/communications were admin/super_admin-only
// routes until this same change widened them to include manager
// (App.jsx), specifically so this real backend is actually reachable.

test('manager can reach and save real booking policies', async ({ page }) => {
  await loginAs(page, 'Manager')
  const policiesLoaded = page.waitForResponse(
    (res) => res.url().includes('/graphql') && res.request().postDataJSON()?.operationName === 'GetOrgBookingPolicies',
  )
  await page.goto('/admin/policies')
  await expect(page.getByText('Policies & Compliance')).toBeVisible()

  // "No-Show Fee" renders immediately from static defaults, independent of
  // the GetOrgBookingPolicies fetch -- waiting on the response directly
  // (not just the label) avoids a real race where the query resolves after
  // this test's fill() and the resulting setPolicies() clobbers it back to
  // the loaded value.
  await policiesLoaded
  await expect(page.getByText('No-Show Fee')).toBeVisible()
  const slotBufferCard = page.locator('.MuiCard-root', { hasText: 'Slot Buffer Time' })
  const slotBufferInput = slotBufferCard.locator('input[type="number"]')
  const before = await slotBufferInput.inputValue()

  await slotBufferInput.fill('12')
  await expect(slotBufferInput).toHaveValue('12')
  await page.getByRole('button', { name: /Save All Changes/ }).click()
  await expect(page.getByText('Policy settings saved successfully.')).toBeVisible()

  await page.reload()
  const afterInput = page.locator('.MuiCard-root', { hasText: 'Slot Buffer Time' }).locator('input[type="number"]')
  await expect(afterInput).toHaveValue('12')

  // Revert
  await afterInput.fill(before)
  await page.getByRole('button', { name: /Save All Changes/ }).click()
  await expect(page.getByText('Policy settings saved successfully.')).toBeVisible()
})

test('manager can reach and save real email sender settings', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/admin/communications')
  await expect(page.getByRole('heading', { name: 'Communications' })).toBeVisible()

  await page.getByRole('tab', { name: 'Global Settings' }).click()
  await expect(page.getByLabel('From Name')).toBeVisible()

  await page.getByLabel('From Name').fill('E2E Test Sender')
  await page.getByRole('button', { name: 'Save Email Settings' }).click()
  await expect(page.getByText('Email settings saved.')).toBeVisible()

  await page.reload()
  await page.getByRole('tab', { name: 'Global Settings' }).click()
  await expect(page.getByLabel('From Name')).toHaveValue('E2E Test Sender')

  // Revert
  await page.getByLabel('From Name').fill('HealthSync')
  await page.getByRole('button', { name: 'Save Email Settings' }).click()
  await expect(page.getByText('Email settings saved.')).toBeVisible()
})
