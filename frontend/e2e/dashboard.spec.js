import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// REQ007 — /dashboard's DASHBOARD_QUERY had no backend at all (schema
// validation error on every load, silently falling back to inline
// MOCK_DASHBOARD). These specs assert against the mock's distinctive
// fabricated numbers to make sure a regression back to mock-fallback would
// actually fail the test, not just "the page renders something".
//
// No explicit page.goto('/dashboard') after loginAs — App.jsx's
// RoleHomeRedirect already lands admin/super_admin/staff there by default.
// An earlier version of this file added a redundant goto() anyway, which
// triggered a full hard navigation that aborted Vite's in-flight chunk
// loads for the chart deps (recharts/dayjs/mui icons) mid-request —
// diagnosed via page.on('pageerror'/'requestfailed') logging, not a
// backend or product bug.

test('dashboard loads with zero GraphQL/console errors for an admin', async ({ page }) => {
  const errors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('response', (res) => {
    if (res.url().includes('/graphql') && res.status() >= 400) errors.push(`${res.status()} on ${res.url()}`)
  })

  await loginAs(page, 'Admin')
  await expect(page.getByText('Total Appointments Today')).toBeVisible({ timeout: 15_000 })

  expect(errors).toEqual([])
})

test('KPI cards show real data, not the old fabricated mock numbers', async ({ page }) => {
  await loginAs(page, 'Admin')

  await expect(page.getByText('Total Appointments Today')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Total Clinicians')).toBeVisible()
  await expect(page.getByText('Total Patients')).toBeVisible()
  await expect(page.getByText('Revenue This Month')).toBeVisible()

  // The old MOCK_DASHBOARD's exact fabricated figures — must never appear again.
  await expect(page.getByText('1,483')).toHaveCount(0)
  await expect(page.getByText('$28,750')).toHaveCount(0)

  await expect(page.getByText('Some dashboard data could not be loaded')).toHaveCount(0)
})

test('upcoming appointments table and charts render without the old mock names', async ({ page }) => {
  await loginAs(page, 'Admin')

  await expect(page.getByText('Upcoming Appointments')).toBeVisible({ timeout: 15_000 })
  // The old MOCK_DASHBOARD.upcoming_appointments' fabricated patient names.
  await expect(page.getByText('John Doe')).toHaveCount(0)
  await expect(page.getByText('Sarah Miller')).toHaveCount(0)
  await expect(page.getByText('Mark Johnson')).toHaveCount(0)

  await expect(page.getByText('Appointment Volume — Last 30 Days')).toBeVisible()
  await expect(page.getByText('Bookings by Service')).toBeVisible()
  await expect(page.getByText('Clinician Utilisation')).toBeVisible()
})
