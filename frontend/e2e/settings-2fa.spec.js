import { test, expect } from '@playwright/test'
import { registerDisposableAccount, computeTotpCode } from './helpers.js'

// PLAN016 Slice C (REQ005) — real TOTP 2FA against backend/src/account's
// startTotpEnrollment/confirmTotpEnrollment/disableTotp and backend/src/
// auth's login/verifyTotpLogin. Uses a disposable, freshly-registered
// account rather than the shared manager@medibook.dev — fullyParallel:true
// means enabling 2FA on a shared login account mid-suite would break every
// other spec's loginAs() call racing against it.

async function login(page, email, password) {
  await page.goto('/login')
  await page.getByLabel('Email Address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.locator('button[type="submit"]').click()
}

// Register + 3 sequential full logins + enrollment + disable, each a real
// network round trip -- comfortably exceeds Playwright's default 30s
// per-test budget. confirmTotpEnrollment also bcrypt-hashes 10 backup
// codes at the service's real cost factor (a couple of seconds alone);
// under heavy concurrent e2e load on this dev machine that has pushed the
// request past the frontend's own 10s AbortController timeout (apollo/
// client.js) before the server even responded -- verified passing
// standalone (`npx playwright test e2e/settings-2fa.spec.js`), same
// "run in small batches, not one long parallel invocation" resource-
// contention caveat already noted elsewhere in this project (CLAUDE.md's
// staff-domain e2e session).
test('enroll, confirm, and verify a real TOTP login (correct code, wrong code, backup code)', async ({ page, request }) => {
  test.slow()
  const { email, password } = await registerDisposableAccount(request)

  await login(page, email, password)
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 })

  await page.goto('/settings')
  await page.getByRole('tab', { name: 'Account & Security' }).click()
  await expect(page.getByRole('button', { name: 'Enable 2FA' })).toBeVisible()
  await page.getByRole('button', { name: 'Enable 2FA' }).click()

  const secretLine = await page.getByText("Can't scan?").textContent()
  const secret = secretLine.split(':').pop().trim()
  const code = computeTotpCode(secret)

  const codeInput = page.locator('.MuiDialog-paper input[type="text"]').last()
  await codeInput.fill(code)
  await page.getByRole('button', { name: 'Verify & Enable' }).click()

  // confirmTotpEnrollment bcrypt-hashes 10 backup codes at the service's
  // real cost factor -- a couple of seconds alone, more under concurrent
  // e2e load, so this gets a longer budget than the other assertions here.
  await expect(page.getByText('2FA is now enabled')).toBeVisible({ timeout: 20_000 })
  const backupCodes = await page.locator('.MuiDialog-paper .MuiGrid-item p').allTextContents()
  expect(backupCodes.length).toBe(10)
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByRole('button', { name: 'Disable 2FA' })).toBeVisible()

  // Log out and log back in — this account now requires the 2FA challenge.
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await login(page, email, password)
  await expect(page.getByText('Two-factor authentication')).toBeVisible({ timeout: 10_000 })

  // Wrong code is rejected.
  const challengeInput = page.locator('input[type="text"]').last()
  await challengeInput.fill('000000')
  await page.getByRole('button', { name: 'Verify' }).click()
  await expect(page.getByText('Incorrect code')).toBeVisible({ timeout: 10_000 })

  // Correct, freshly-computed TOTP code succeeds.
  await challengeInput.fill(computeTotpCode(secret))
  await page.getByRole('button', { name: 'Verify' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 })

  // A backup code works exactly once.
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await login(page, email, password)
  await expect(page.getByText('Two-factor authentication')).toBeVisible({ timeout: 10_000 })
  const backupInput = page.locator('input[type="text"]').last()
  await backupInput.fill(backupCodes[0])
  await page.getByRole('button', { name: 'Verify' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 })

  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await login(page, email, password)
  await expect(page.getByText('Two-factor authentication')).toBeVisible({ timeout: 10_000 })
  const reuseInput = page.locator('input[type="text"]').last()
  await reuseInput.fill(backupCodes[0])
  await page.getByRole('button', { name: 'Verify' }).click()
  await expect(page.getByText('Incorrect code')).toBeVisible({ timeout: 10_000 })

  // Clean disable, using a still-unused backup code to get back in.
  await reuseInput.fill(backupCodes[1])
  await page.getByRole('button', { name: 'Verify' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 })

  await page.goto('/settings')
  await page.getByRole('tab', { name: 'Account & Security' }).click()
  await page.getByRole('button', { name: 'Disable 2FA' }).click()
  await page.locator('.MuiDialog-paper input[type="password"]').fill(password)
  await page.locator('.MuiDialog-paper').getByRole('button', { name: 'Disable 2FA' }).click()
  await expect(page.getByRole('button', { name: 'Enable 2FA' })).toBeVisible({ timeout: 10_000 })
})
