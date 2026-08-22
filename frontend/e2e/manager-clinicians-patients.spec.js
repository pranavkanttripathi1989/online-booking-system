import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// Priority 1 e2e coverage for the `clinicians` and `patients` backend
// domains — both verified real via Chrome MCP live inspection
// (context/qa-full-inventory.md §7).

test('manager sees real seeded clinicians with real availability data', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/clinicians')

  await expect(page.getByText('Sarah Mitchell')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('General Physician')).toBeVisible()
})

// REQ013/PLAN023 Phase A re-audit (2026-08-22) — `allClinicians =
// apiClinicians.length > 0 ? apiClinicians : MOCK_CLINICIANS` fell back to
// 8 fabricated clinicians whenever a real search genuinely matched zero
// real clinicians, not just on a real query error. Same bug class already
// found and fixed this session in appointments/index.jsx and
// calendar/index.jsx.
test('a search matching zero real clinicians shows a real empty state, not 8 fabricated ones', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/clinicians')
  await expect(page.getByText('Sarah Mitchell')).toBeVisible({ timeout: 15_000 })

  await page.getByLabel('Search clinicians').fill('ZZZ_NO_SUCH_CLINICIAN_ZZZ')
  await page.waitForTimeout(1000)

  await expect(page.getByText('Sarah Mitchell')).not.toBeVisible()
  await expect(page.getByText('Dr. Jane Smith')).not.toBeVisible()
})

test('manager sees real seeded patients', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/patients')

  await expect(page.getByText('Anita Sharma')).toBeVisible({ timeout: 15_000 })
})

// Priority 3 mock-removal sweep (2026-08-22) — CreateClinicianPage.jsx's
// onSubmit had `const useMock = true // always use mock in dev for now`
// unconditionally short-circuiting to MockStore.createClinician(), leaving
// the real, already-wired createClinician mutation right below it as dead
// code: every "new clinician" created through this page never actually
// existed in the real database, despite a real success toast. No delete UI
// exists for clinicians, so this test's created row is accepted debris, same
// precedent as manager-services.spec.js's undeleted "E2E Service *" row.
test('creating a clinician calls the real createClinician mutation and persists it', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/clinicians/new')

  const uniqueEmail = `e2e-clinician-${Date.now()}@medibook.dev`
  await page.getByLabel('First Name *').fill('E2E')
  await page.getByLabel('Last Name *').fill('TestClinician')
  await page.getByLabel('Email *').fill(uniqueEmail)
  // Real backend requirement (CliniciansService.create): at least one clinic.
  await page.locator('label:has-text("Clinics") + div .MuiSelect-select').click()
  await page.getByRole('option').first().click()
  await page.keyboard.press('Escape')

  const responsePromise = page.waitForResponse(
    (res) => res.url().includes('/graphql') && res.request().postData()?.includes('CreateClinician'),
    { timeout: 15_000 },
  )
  await page.getByRole('button', { name: 'Save Clinician' }).click()
  const response = await responsePromise
  const body = await response.json()
  expect(body.errors).toBeUndefined()
  expect(body.data.createClinician.id).toBeTruthy()

  await expect(page.getByText('Clinician created successfully')).toBeVisible()
  // Real navigation lands on the real clinician's own detail page -- a fake
  // mock id would 404 or show a mismatched/placeholder record instead.
  await page.waitForURL((url) => url.pathname === `/clinicians/${body.data.createClinician.id}`, { timeout: 15_000 })
  await expect(page.getByText('E2E TestClinician')).toBeVisible({ timeout: 15_000 })
})

// Priority 3 mock-removal sweep (2026-08-22) — clinicians/detail.jsx (the
// full-page /clinicians/:id route) was a single hardcoded MOCK_CLINICIAN
// object ("Dr. Jane Smith") with zero real GraphQL call: every clinician's
// detail page showed the exact same fabricated profile regardless of which
// real clinician's id was in the URL. Rewired onto the real
// CLINICIAN_DETAIL_QUERY (the same query ClinicianProfileDrawer.jsx, used by
// the clinicians list page, already used successfully).
test('clinician detail page shows the real clinician, not the fake "Dr. Jane Smith"', async ({ page }) => {
  await loginAs(page, 'Manager')
  // Real seeded clinician id -- clinicians/index.jsx's own row click opens
  // ClinicianProfileDrawer (already real), not this full-page route, so
  // navigate straight to the /clinicians/:id route under test.
  await page.goto('/clinicians/8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7')

  await expect(page.getByText('Sarah Mitchell')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Dr. Jane Smith')).not.toBeVisible()
  await expect(page.getByText('jane.smith@medibook.dev')).not.toBeVisible()
})
