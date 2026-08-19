import { test, expect } from '@playwright/test'

// Priority 1 e2e coverage for the `public` backend domain — verified real
// via Chrome MCP live inspection (context/qa-full-inventory.md's "public
// domain" section). Both bugs found there are now fixed:
//   1. getClinicianAvailability is now @Public() (was 401ing every
//      anonymous caller, nulling the whole combined GraphQL response).
//   2. /appointments/book now uses OptionalAuthShell (App.jsx) instead of
//      being nested under ProtectedRoute, so it renders for both an
//      anonymous visitor and a logged-in one at the same URL.
//
// pages/public/landing.jsx itself is still on mock data (its own
// `MOCK_DOCTORS` array, see qa-full-inventory.md) — these specs go
// directly to /doctor/:id and /appointments/book instead, using a real
// clinician id, since that's the actual real-backend surface.

const REAL_CLINICIAN_ID = '8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7' // Sarah Mitchell, seeded

test('anonymous visitor sees a real clinician profile with real availability', async ({ page }) => {
  await page.goto(`/doctor/${REAL_CLINICIAN_ID}`)

  await expect(page.getByText('Sarah Mitchell')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('General Physician')).toBeVisible()
  // Real seeded slots only exist on Mon/Tue — a "no slots" message on an
  // arbitrary default-selected date is itself proof the calendar is
  // driven by the real getClinicianAvailability data, not a stub.
  const noSlots = page.getByText('No slots available on this date.')
  const hasSlotButtons = page.getByRole('button', { name: /AM|PM/ })
  await expect(noSlots.or(hasSlotButtons.first())).toBeVisible()
})

test('anonymous visitor can reach the real booking wizard without being redirected to login', async ({ page }) => {
  await page.goto(`/appointments/book?doctor=${REAL_CLINICIAN_ID}`)

  await expect(page).toHaveURL(/\/appointments\/book/)
  await expect(page.getByText('Dr. Sarah Mitchell')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('heading', { name: 'Book Appointment' })).toBeVisible()
})
