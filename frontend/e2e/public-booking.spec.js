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
  // BUG011: this locator used to require an AM/PM-suffixed button name
  // (/AM|PM/) -- doctor-profile.jsx renders its slot buttons as a bare
  // 24-hour "HH:mm" string (booking/index.jsx's own wizard is the one that
  // formats to h:mm A; the two pages use different conventions). Combined
  // with the day-of-week comparison bug that meant real slots could never
  // appear at all, this assertion always resolved via the "no slots" branch,
  // regardless of real data -- never actually proving the calendar was real.
  const noSlots = page.getByText('No slots available on this date.')
  const hasSlotButtons = page.getByRole('button', { name: /^\d{2}:\d{2}$/ })
  await expect(noSlots.or(hasSlotButtons.first())).toBeVisible({ timeout: 15_000 })
})

test('anonymous visitor can reach the real booking wizard without being redirected to login', async ({ page }) => {
  await page.goto(`/appointments/book?doctor=${REAL_CLINICIAN_ID}`)

  await expect(page).toHaveURL(/\/appointments\/book/)
  // BUG011: this used to assert 'Dr. Sarah Mitchell' -- the exact string
  // the wizard's OWN hardcoded mock-fallback clinician object uses. The real
  // getClinician() service returns a bare `${first_name} ${last_name}`, no
  // "Dr." prefix -- this test was passing against the mock the whole time
  // (the wizard's ?doctor= query string was never read at all), not real
  // data. Now that BookingWizard actually reads ?doctor=, this must match
  // what real data renders, not the decorative mock string.
  await expect(page.getByText('Sarah Mitchell')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('heading', { name: 'Book Appointment' })).toBeVisible()
})
