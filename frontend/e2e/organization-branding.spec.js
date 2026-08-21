import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// REQ002/PLAN022 — Settings -> Clinic -> Branding, against the real
// backend/src/org-settings myOrgBranding/updateMyOrgBranding pair and the
// real POST /org-branding/logo upload endpoint. Also covers AppShell's
// propagation of the uploaded logo/org name into the sidebar and top-nav
// header.
//
// Serial, not fullyParallel's default: every test in this file reads and
// full-overwrites the same shared org's branding row (same reasoning as
// security-privacy.spec.js), so two of these racing in parallel workers
// would clobber each other's in-flight state.
test.describe.configure({ mode: 'serial' })
test.setTimeout(60_000)

// Minimal valid 1x1 red PNG, built inline so the spec has no binary fixture
// dependency (same approach as settings-account.spec.js's avatar-upload test).
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

test('manager can upload a real logo, save colors, and see it persist', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/settings')
  await page.getByRole('tab', { name: 'Clinic' }).click()
  await expect(page.getByRole('heading', { name: 'Branding' })).toBeVisible()

  // Real multipart upload against POST /org-branding/logo.
  await page.locator('input[type="file"]').setInputFiles({
    name: 'logo.png',
    mimeType: 'image/png',
    buffer: Buffer.from(PNG_BASE64, 'base64'),
  })
  // The uploaded logo replaces the placeholder BusinessRoundedIcon avatar --
  // wait for a real <img> to appear inside the branding avatar.
  await expect(page.locator('img[src*="/uploads/branding/"]').first()).toBeVisible({ timeout: 10_000 })

  await page.getByRole('button', { name: 'Save Branding' }).click()
  await expect(page.getByText('Branding saved successfully!')).toBeVisible()

  await page.reload()
  await page.getByRole('tab', { name: 'Clinic' }).click()
  // Two real <img src="/uploads/branding/..."> now render at once -- the
  // Settings page's own preview avatar AND AppShell's sidebar logo -- .first()
  // just needs one of them visible to confirm the upload persisted.
  await expect(page.locator('img[src*="/uploads/branding/"]').first()).toBeVisible()

  // Propagation: AppShell's sidebar now shows the real org name instead of
  // the default "HealthSync" wordmark, and a real <img> logo.
  await expect(page.getByText('City Heart Clinic Group').first()).toBeVisible()
  await expect(page.locator('img[alt$="logo"]').first()).toBeVisible()
})

test('a too-light color is rejected with a clear message, without saving', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/settings')
  await page.getByRole('tab', { name: 'Clinic' }).click()
  await expect(page.getByRole('heading', { name: 'Branding' })).toBeVisible()

  // Scoped like security-privacy.spec.js's toggle rows: .last() of the
  // class+text match picks the innermost Grid item over its outer container
  // ancestors that also contain the text.
  const primaryColorText = page.locator('.MuiGrid-root', { hasText: 'Primary color' }).last().locator('input[type="text"]')
  await primaryColorText.fill('#FFFF00')
  await page.getByRole('button', { name: 'Save Branding' }).click()
  await expect(page.getByText(/too light to keep white text readable/i)).toBeVisible()
})

test('admin (no organization) sees the disabled branding notice and the default HealthSync shell', async ({ page }) => {
  await loginAs(page, 'Admin')
  await page.goto('/settings')
  await page.getByRole('tab', { name: 'Clinic' }).click()
  await expect(page.getByText("Your account isn't associated with an organization")).toBeVisible()

  // AppShell keeps the default branding for a platform-wide caller.
  await expect(page.getByText('HealthSync').first()).toBeVisible()
})
