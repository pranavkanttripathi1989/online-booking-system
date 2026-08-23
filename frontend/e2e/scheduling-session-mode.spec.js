import { test, expect } from '@playwright/test'
import { loginAs } from './helpers.js'

// REQ017 — dual-mode scheduling (session/token mode). Verifies the two new
// surfaces built for this requirement: the manager availability form's new
// mode/capacity fields, and the public booking wizard rendering a "join
// this session" card in place of the time-slot grid once a session-mode
// window exists. Session-mode capacity enforcement (the advisory-lock-
// guarded count-then-insert, sequential token_no assignment, rejection at
// capacity+overbook_allowance) is covered deterministically by backend unit
// tests (appointments.service.spec.ts / public.service.spec.ts) — a real
// booking through this wizard cannot be driven to completion in e2e at all
// (Razorpay's own Checkout iframe isn't automatable, matching
// booking-payment.spec.js's own documented ceiling), so this spec verifies
// the frontend correctly wires up to the already-proven backend rather than
// re-proving the backend logic itself.

const REAL_CLINICIAN_ID = '8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7' // Sarah Mitchell, seeded

// Late evening, daily recurrence — deliberately clear of Sarah Mitchell's
// existing daytime slot-mode availability (used by other specs, e.g.
// public-booking.spec.js's own slot-button assertion) so this test's setup
// can't make an unrelated spec's real data disappear or double up.
const SESSION_START = '20:00'
const SESSION_END = '22:00'
const SESSION_CAPACITY = '99'

test('manager can configure a session/token availability window, and the public wizard reflects it', async ({ page }) => {
  // Longer than the 30s default: this test does login, a multi-field form
  // submission, a real mutation round-trip, a second (anonymous) browser
  // context navigating a separate lazy-loaded route, and cleanup -- each
  // step alone is quick, but they add up past 30s legitimately.
  test.setTimeout(90_000)
  await loginAs(page, 'Manager')
  await page.goto('/manager/availability')

  await page.getByRole('button', { name: 'Add Availability' }).click()

  // MUI Select doesn't expose an accessible name via label association here
  // (confirmed by manager-staff.spec.js's own note) -- index into the
  // comboboxes in DOM order instead: Clinician, Clinic, Scheduling Mode,
  // Recurrence (Day of Week only appears for the default 'weekly' recurrence).
  await page.getByRole('combobox').nth(0).click()
  await page.getByRole('option', { name: 'Sarah Mitchell' }).click()

  await page.getByRole('combobox').nth(1).click()
  await page.getByRole('option').first().click()

  await page.getByRole('combobox').nth(2).click()
  await page.getByRole('option', { name: 'Session / token' }).click()

  await page.getByLabel('Capacity (tokens)').fill(SESSION_CAPACITY)

  await page.locator('input[type="time"]').first().fill(SESSION_START)
  await page.locator('input[type="time"]').nth(1).fill(SESSION_END)

  await page.getByRole('combobox').nth(3).click()
  await page.getByRole('option', { name: 'Daily' }).click()

  const createResponse = page.waitForResponse(
    (res) => res.url().includes('/graphql') && res.request().postData()?.includes('createAvailability'),
  )
  await page.getByRole('button', { name: 'Create' }).click()
  await createResponse

  // Confirms the new mode/capacity fields round-tripped through the real
  // mutation and back through the real query, not just a local optimistic
  // update — the chip text is built from the server's own response.
  await expect(page.getByText(`Session · ${SESSION_CAPACITY} tokens`).first()).toBeVisible({ timeout: 15_000 })

  // ── Public wizard reflects the new session window ──────────────────────
  // A genuinely separate, anonymous browser context -- page.context().newPage()
  // would share the manager's own cookies/localStorage, rendering the wizard
  // inside the authenticated AppShell (OptionalAuthShell's *other* branch)
  // instead of as the anonymous visitor this assertion needs.
  const anonContext = await page.context().browser().newContext()
  const wizardPage = await anonContext.newPage()
  await wizardPage.goto(`/appointments/book?doctor=${REAL_CLINICIAN_ID}`)
  await expect(wizardPage.getByText('Sarah Mitchell')).toBeVisible({ timeout: 15_000 })

  // Navigate the date calendar isn't needed for a daily-recurrence window —
  // it applies to whatever date the wizard defaults to (today).
  await expect(wizardPage.getByRole('heading', { name: /session$/i })).toBeVisible({ timeout: 15_000 })
  await expect(wizardPage.getByText(/spots? left/i)).toBeVisible()
  await expect(wizardPage.getByRole('button', { name: 'Join this session' })).toBeVisible()
  await anonContext.close()

  // ── Cleanup: delete the test availability window ────────────────────────
  // Not a hard requirement (this codebase accepts some test-created rows
  // persisting, e.g. manager-services.spec.js's own test service), but a
  // session-mode window on a shared, heavily-reused seeded clinician is
  // cheap to clean up and avoids any future spec tripping over "why does
  // Sarah Mitchell have a 99-capacity evening session".
  // Loop rather than a single delete: robust against any leftover row(s)
  // from a prior interrupted run (this test creates exactly one per pass,
  // but a run that fails between creation and cleanup leaves one behind).
  const sessionChip = page.getByText(`Session · ${SESSION_CAPACITY} tokens`)
  while (await sessionChip.count() > 0) {
    const row = page.locator('tr', { hasText: `Session · ${SESSION_CAPACITY} tokens` }).first()
    await row.getByRole('button', { name: /Delete availability/i }).click()
    await page.getByRole('button', { name: 'Delete' }).click()
    await page.waitForTimeout(1000)
  }
  await expect(sessionChip).not.toBeVisible()
})
