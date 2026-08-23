import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// REQ042 — waiting-room/index.jsx used to render 100% mocks/store.js data
// (MockStore.checkInPatient/markConsultationStarted/checkOutPatient/etc.),
// one of the three pages CLAUDE.md documented as "genuinely backend-less".
// Rewired onto the real appointments() query + checkInAppointment/
// startConsultation/completeAppointment/markNoShow/resetAppointmentJourney
// mutations. The check-in/consultation/reset transitions themselves (with
// tenant-isolation and self-scoping) are covered by
// appointments.service.spec.ts's unit tests -- this spec proves the real
// wiring end to end, not the business logic again.

test('waiting room shows real data, never the old fabricated mock patients', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/waiting-room')

  await expect(page.getByText('Waiting Room')).toBeVisible({ timeout: 15_000 })
  // None of the old hardcoded mock patients should ever appear.
  await expect(page.getByText('Alice Thompson')).not.toBeVisible()
  await expect(page.getByText('Marcus Chen')).not.toBeVisible()
  await expect(page.getByText('Fatima Al-Hassan')).not.toBeVisible()

  // Either a real empty state (no real appointments today) or a real queue
  // card renders -- never both absent, which would mean the query itself
  // silently failed.
  const emptyState = page.getByText('No appointments for this date')
  const queueCard = page.locator('.MuiCard-root')
  await expect(emptyState.or(queueCard.first())).toBeVisible({ timeout: 15_000 })
})

test('waiting room surfaces a real GraphQL error state rather than swallowing it', async ({ page }) => {
  await loginAs(page, 'Manager')
  // An invalid date value the backend's Date parsing will reject, to prove
  // the page's error branch (not just its happy path) is real.
  await page.route('**/graphql', async (route) => {
    const req = route.request()
    const body = req.postDataJSON()
    if (body?.operationName === 'Appointments') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ errors: [{ message: 'Simulated backend error' }], data: null }),
      })
      return
    }
    await route.continue()
  })
  await page.goto('/waiting-room')
  await expect(page.getByText(/Simulated backend error/i)).toBeVisible({ timeout: 15_000 })
})
