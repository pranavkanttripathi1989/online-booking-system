import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// Priority 3 mock-removal sweep (2026-08-22) — calendar/index.jsx's
// `events = realEvents.length > 0 ? realEvents : generateMockCalendarData()`
// fell back to a full month of fabricated events whenever a real filter
// combination genuinely matched zero real appointments, same bug class as
// appointments/index.jsx (manager-appointments.spec.js). Fixed to only fall
// back on a real query error.

test('calendar shows real seeded appointments, not fabricated ones', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/calendar')

  // Anita Sharma is a real seeded appointment for today. At realistic data
  // volume (BUG019) today's day cell in the month grid holds far more than
  // FullCalendar's dayMaxEvents={3}, so her event is legitimately collapsed
  // behind a "+N more" link there -- assert against the Today's Schedule
  // sidebar instead, which is the one place on this page designed to list
  // the full, untruncated day. None of the mock generator's fabricated
  // names (John Miller, Sarah Evans, ...) should ever appear.
  const todayPanel = page.getByTestId('today-schedule-panel')
  await expect(todayPanel.getByText('Anita Sharma').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('John Miller')).not.toBeVisible()
})

test('a real filter with zero matches shows a real empty calendar, not fabricated events', async ({ page }) => {
  await loginAs(page, 'Manager')
  await page.goto('/calendar')
  const todayPanel = page.getByTestId('today-schedule-panel')
  await expect(todayPanel.getByText('Anita Sharma').first()).toBeVisible({ timeout: 15_000 })

  const gqlPromise = page.waitForResponse((res) => res.url().includes('/graphql') && res.request().postData()?.includes('appointments('), {
    timeout: 15_000,
  })
  await page.locator('.MuiSelect-select', { hasText: 'All Statuses' }).click()
  await page.getByRole('option', { name: 'No Show' }).click()
  await gqlPromise
  await page.waitForTimeout(1000)

  // Zero real no_show appointments exist for this org -- must not fall back
  // to the generated month of fake events.
  await expect(page.getByText('Anita Sharma')).not.toBeVisible()
  await expect(page.getByText('John Miller')).not.toBeVisible()
})
