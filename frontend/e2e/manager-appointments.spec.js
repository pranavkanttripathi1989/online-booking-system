import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// Priority 1 e2e coverage for the `appointments` backend domain — verified
// real via Chrome MCP live inspection (context/qa-full-inventory.md §7):
// real seeded appointments render on the "All" tab (the "Upcoming" tab is
// legitimately empty for the seed data's dates relative to "today").

test('manager sees real seeded appointments', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/appointments')

  await page.getByRole('tab', { name: 'All' }).click()
  await expect(page.getByText('Anita Sharma')).toBeVisible({ timeout: 15_000 })
  // Sarah Mitchell is the clinician on every seeded appointment row.
  await expect(page.getByText('Sarah Mitchell').first()).toBeVisible()
})

// Priority 3 mock-removal sweep (2026-08-22) — appointments/detail.jsx's
// Reschedule dialog used to call MockStore.updateAppointment() unconditionally,
// even for a real appointment loaded from the real backend: the success
// toast fired and the user was sent back to the list, but the real
// appointment's start_datetime was never actually updated anywhere. Rewired
// onto the real, already-defined-but-unused UPDATE_APPOINTMENT_MUTATION.
test('rescheduling a real appointment calls the real updateAppointment mutation', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/appointments')
  await page.getByRole('tab', { name: 'All' }).click()
  const row = page.locator('.MuiDataGrid-row', { hasText: 'Anita Sharma' }).first()
  await row.getByRole('button', { name: 'View' }).click()
  await expect(page.getByRole('heading', { name: 'Appointment Details' })).toBeVisible({ timeout: 15_000 })

  const responsePromise = page.waitForResponse(
    (res) => res.url().includes('/graphql') && res.request().postData()?.includes('UpdateAppointment'),
    { timeout: 15_000 },
  )
  await page.getByRole('button', { name: 'Reschedule' }).click()
  // Confirm with the dialog's own pre-populated (unchanged) values -- proves
  // a real network mutation fires on save, not a silent MockStore no-op.
  await page.getByRole('button', { name: 'Confirm Reschedule' }).click()
  const response = await responsePromise
  expect(response.ok()).toBe(true)
  const body = await response.json()
  expect(body.errors).toBeUndefined()
  await expect(page.getByText('Appointment rescheduled successfully.')).toBeVisible()
})

// Priority 3 mock-removal sweep (2026-08-22) — `rows = apiRows.length > 0 ?
// apiRows : mockRows` fell back to 35 fabricated mock rows whenever a real,
// valid filter combination genuinely matched zero real appointments, not
// just on a real network/GraphQL error -- live-confirmed: filtering by
// status=no_show (zero real matches for this org) rendered three completely
// fake patients (Kavya Nair, Ingrid Larsson, Hassan Malik). Fixed to only
// fall back on a real `error`.
test('a real filter with zero matches shows a real empty state, not fabricated mock rows', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/appointments')
  await page.getByRole('tab', { name: 'All' }).click()
  await page.getByRole('combobox', { name: 'Status All Statuses' }).click()
  await page.getByRole('option', { name: 'No Show', exact: false }).click()
  await page.waitForTimeout(1500)

  expect(await page.locator('.MuiDataGrid-row').count()).toBe(0)
  await expect(page.getByText('Kavya Nair')).not.toBeVisible()
})
