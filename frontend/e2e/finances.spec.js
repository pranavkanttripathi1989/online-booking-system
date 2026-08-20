import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// REQ004 slice 2 — finances/index.jsx real data (backend/src/appointment-payments'
// myFinanceTransactions/myFinanceSummary). Depends on the real AppointmentPayments
// rows created during REQ004 slice 1's live verification (4 rows: 2 pending,
// 1 succeeded, 1 failed, all "GP Consultation" / real seeded patient names) —
// if that dev data is ever cleared, these assertions will need real payments
// created again first.

test('finances page shows real payment data, not the old mock names', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/finances')

  await expect(page.getByText('Real patient payments, captured via Razorpay')).toBeVisible()
  // None of the old hardcoded mock names should ever appear.
  await expect(page.getByText('John Doe')).not.toBeVisible()
  await expect(page.getByText('Sarah Miller')).not.toBeVisible()

  // Real data from REQ004 slice 1's live verification.
  await expect(page.getByText('GP Consultation').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('₹499').first()).toBeVisible()
})

test('KPI cards show real computed figures, not the old fabricated wallet/credit numbers', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/finances')

  await expect(page.getByText('Revenue This Month')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Active Balance')).toHaveCount(0)
  await expect(page.getByText('Bonus Credits')).toHaveCount(0)
  await expect(page.getByText(/Succeeded Payments/)).toBeVisible()
  await expect(page.getByText(/Failed Payments/)).toBeVisible()
})

test('revenue chart tab renders real monthly data', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/finances')
  await page.getByRole('tab', { name: 'Revenue Chart' }).click()

  await expect(page.getByText('Real captured Razorpay payments, by month')).toBeVisible()
  await expect(page.getByText('Total Revenue (selected range)')).toBeVisible()
  // No expense/net-profit cards — no expense tracking exists yet.
  await expect(page.getByText('Total Expenses')).toHaveCount(0)
  await expect(page.getByText('Net Profit')).toHaveCount(0)
})

test('payment methods tab is honestly disabled, not a fake card list', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/finances')
  await page.getByRole('tab', { name: 'Payment Methods' }).click()

  await expect(page.getByText(/Saved payment methods aren't built yet/)).toBeVisible()
  await expect(page.getByText('•••• •••• ••••')).toHaveCount(0)
})

test('CSV export still works against real data', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/finances')
  await expect(page.getByText('GP Consultation').first()).toBeVisible({ timeout: 15_000 })

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export transactions as CSV' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/finances_report_.*\.csv/)
})
