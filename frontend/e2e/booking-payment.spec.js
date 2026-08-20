import { test, expect } from '@playwright/test'

// REQ004 — real Razorpay payment capture. Completing an actual test
// payment inside Razorpay's own Checkout iframe isn't automatable
// headlessly (third-party widget, needs real test-mode card/UPI input) —
// that step is manual (see test-results doc). This spec instead proves
// everything up to and including opening the real widget against a real
// Razorpay order works end to end in a real browser: the wizard flow,
// booking the appointment, calling the real createRazorpayOrder mutation,
// and Razorpay's own checkout.js successfully mounting its payment iframe.

const REAL_CLINICIAN_ID = '8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7' // Sarah Mitchell, seeded

test('booking wizard opens a real Razorpay Checkout widget for a real order', async ({ page }) => {
  await page.goto(`/appointments/book?doctor=${REAL_CLINICIAN_ID}`)
  await expect(page.getByRole('heading', { name: 'Book Appointment' })).toBeVisible({ timeout: 15_000 })

  // Step 1 — Select Time
  const slotButton = page.getByRole('button', { name: /AM|PM/ }).first()
  await expect(slotButton).toBeVisible({ timeout: 15_000 })
  await slotButton.click()
  await page.getByRole('button', { name: 'Next Step' }).click()

  // Step 2 — Your Details
  await page.getByLabel('First Name').fill('E2E')
  await page.getByLabel('Last Name').fill('Payer')
  await page.getByLabel('Email').fill('e2e-payer@medibook.dev')
  await page.getByLabel('Phone').fill('9810000099')
  await page.getByLabel('Reason for visit').fill('E2E test booking for Razorpay payment verification')
  await page.getByRole('button', { name: 'Next Step' }).click()

  // Step 3 — Choose Service (first product card)
  await expect(page.getByText('Select a Service')).toBeVisible()
  await page.locator('.MuiCard-root').first().click()
  await page.getByRole('button', { name: 'Next Step' }).click()

  // Step 4 — Review and Pay
  await expect(page.getByText('Review Booking')).toBeVisible()
  await expect(page.getByText(/Razorpay's secure checkout/)).toBeVisible()
  await page.getByLabel('I accept the cancellation policy').check()

  const payButton = page.getByRole('button', { name: /Confirm and Pay/ })
  await expect(payButton).toBeEnabled({ timeout: 10_000 }) // waits for checkout.js to load (window.Razorpay ready)
  await payButton.click()

  // Razorpay's real Checkout widget mounts its own iframe(s) — confirms the
  // whole client chain (book appointment -> real createRazorpayOrder call
  // -> real order_id from Razorpay's API -> widget opens) actually worked.
  // Checking attachment rather than deep visibility of the cross-origin
  // iframe's content — Razorpay nests multiple iframes and which one is
  // visually "visible" is an implementation detail of their widget, not
  // something this integration controls; a real payment run is manual
  // (see test-results doc).
  await expect(page.locator('iframe[src*="razorpay"]').first()).toBeAttached({ timeout: 20_000 })
})
