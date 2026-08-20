import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// Priority 1 e2e coverage for the `staff` backend domain — the last of the
// 22 backend domains without an e2e spec (CLAUDE.md). staff/{index,new,edit}.jsx
// ran on mocks/store.js exclusively until now even though backend/src/staff
// was built from scratch specifically to match their shape (see
// staff/entities/staff.entity.ts) — a pure frontend wiring gap, not a missing
// resolver. "Jamie Reception" is the real seeded receptionist@medibook.dev
// account (backend/prisma/seed.ts) and doesn't exist in mocks/store.js's
// fixture data, so seeing it proves this hits the real backend.

test('admin sees real seeded staff and can add a new staff member', async ({ page }) => {
  await loginAs(page, 'Admin')
  await page.goto('/staff')

  await expect(page.getByText('Jamie Reception')).toBeVisible({ timeout: 15_000 })

  await page.getByRole('button', { name: 'Add Staff Member' }).click()
  await page.waitForURL('**/staff/new')

  const email = `e2e.staff.${Date.now()}@medibook.dev`
  const name = `E2E Staff ${Date.now()}`
  await page.getByLabel('Full Name *').fill(name)
  await page.getByLabel('Email Address *').fill(email)
  // phone is globally @unique on UserProfiles (OTP login needs an unambiguous
  // phone→account lookup) — a fixed number here collided across repeated
  // real-backend runs the same way manager-services.spec.js's price locator
  // did; use a per-run value like the email above.
  await page.getByLabel('Phone Number *').fill(`+9198100${String(Date.now()).slice(-5)}`)
  // MUI Select doesn't expose an accessible name via label association here,
  // so getByLabel can't find it — the two comboboxes appear in Role,
  // Department DOM order, so index into them instead.
  await page.getByRole('combobox').nth(0).click()
  await page.getByRole('option', { name: 'Receptionist' }).click()
  await page.getByRole('combobox').nth(1).click()
  await page.getByRole('option', { name: 'Front Desk' }).click()
  await page.getByLabel('Password *', { exact: true }).fill('E2ePassword123!')
  await page.getByLabel('Confirm Password *').fill('E2ePassword123!')

  // Two "Add Staff Member" buttons exist (top header + bottom form actions) —
  // disambiguate rather than risk a strict-mode violation.
  await page.getByRole('button', { name: 'Add Staff Member' }).last().click()

  await page.waitForURL('**/staff')
  await expect(page.getByText(name)).toBeVisible({ timeout: 15_000 })
})
